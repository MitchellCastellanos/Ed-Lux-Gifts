import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '@/lib/db';
import { createOrder } from '@/lib/orders';
import { requestHistoryCode, verifyHistoryCode, requestOrderCode, verifyOrderCode, sessionOrders, getCustomerSession, endCustomerSession, MAX_ATTEMPTS } from '@/lib/verification';
import { resetDb, fixtures, checkout, readyItem, WED } from './helpers';

let ipn = 0;
const ip = () => `10.0.0.${++ipn}`;
beforeEach(resetDb);

async function setup() {
  const f = await fixtures({ stock: 20 });
  const mk = (over: Record<string, any>) => createOrder(checkout({ cart: [readyItem(f.product.id)], ...over }), { now: WED });
  const a = await mk({ purchaser: { phone: '514-555-0123', email: 'marie@example.com', name: 'Marie' } });
  const b = await mk({ purchaser: { phone: '(514) 555-0123', email: 'luc@example.com', name: 'Luc' } }); // same phone, other email
  const c = await mk({ purchaser: { phone: '514-555-0999', email: 'other@example.com', name: 'Other' } });
  if (!a.ok || !b.ok || !c.ok) throw new Error('setup');
  return { f, a, b, c };
}

describe('order history verification', () => {
  it('phone number alone never grants anything; unknown combos get the same generic response', async () => {
    await setup();
    const known = await requestHistoryCode('514-555-0123', 'marie@example.com', ip(), 'fr');
    const unknownEmail = await requestHistoryCode('514-555-0123', 'stranger@example.com', ip(), 'fr');
    const unknownPhone = await requestHistoryCode('514-555-0000', 'marie@example.com', ip(), 'fr');
    expect(known.ok && unknownEmail.ok && unknownPhone.ok).toBe(true);
    expect(Object.keys(unknownEmail)).toEqual(['ok']); // no code material for non-matches
    expect(await prisma.verificationCode.count()).toBe(1);
    // a guessed code with a phone only cannot create a session
    expect(await verifyHistoryCode('514-555-0123', 'stranger@example.com', '123456', ip())).toEqual({ ok: false });
    expect(await prisma.customerSession.count()).toBe(0);
  });

  it('full flow: code → session → ONLY orders matching verified email AND phone (shared phone stays private)', async () => {
    const { a } = await setup();
    const req = await requestHistoryCode('514-555-0123', 'MARIE@example.com', ip(), 'fr');
    if (!req.ok || !req.devCode) throw new Error('dev code expected in test env');
    const v = await verifyHistoryCode('(514) 555-0123', 'marie@example.com', req.devCode, ip());
    if (!v.ok) throw new Error('verify failed');
    const s = await getCustomerSession(v.token);
    expect(s).not.toBeNull();
    const orders = await sessionOrders(s!);
    expect(orders.map((o) => o.number)).toEqual([a.order.number]); // Luc's order on the same phone is NOT exposed
    await endCustomerSession(v.token);
    expect(await getCustomerSession(v.token)).toBeNull();
  });

  it('codes are single-use', async () => {
    await setup();
    const req = await requestHistoryCode('514-555-0123', 'marie@example.com', ip(), 'fr');
    if (!req.ok || !req.devCode) throw new Error();
    expect((await verifyHistoryCode('514-555-0123', 'marie@example.com', req.devCode, ip())).ok).toBe(true);
    expect((await verifyHistoryCode('514-555-0123', 'marie@example.com', req.devCode, ip())).ok).toBe(false);
  });

  it('single-use holds under concurrent verification', async () => {
    await setup();
    const req = await requestHistoryCode('514-555-0123', 'marie@example.com', ip(), 'fr');
    if (!req.ok || !req.devCode) throw new Error();
    const rs = await Promise.all(Array.from({ length: 5 }, () => verifyHistoryCode('514-555-0123', 'marie@example.com', req.devCode!, ip())));
    expect(rs.filter((r) => r.ok).length).toBe(1);
  });

  it('expires after 10 minutes', async () => {
    await setup();
    const req = await requestHistoryCode('514-555-0123', 'marie@example.com', ip(), 'fr');
    if (!req.ok || !req.devCode) throw new Error();
    await prisma.verificationCode.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await verifyHistoryCode('514-555-0123', 'marie@example.com', req.devCode, ip())).ok).toBe(false);
  });

  it('limits wrong attempts, then locks even the right code', async () => {
    await setup();
    const req = await requestHistoryCode('514-555-0123', 'marie@example.com', ip(), 'fr');
    if (!req.ok || !req.devCode) throw new Error();
    const wrong = req.devCode === '000000' ? '111111' : '000000';
    for (let i = 0; i < MAX_ATTEMPTS; i++) expect((await verifyHistoryCode('514-555-0123', 'marie@example.com', wrong, ip())).ok).toBe(false);
    expect((await verifyHistoryCode('514-555-0123', 'marie@example.com', req.devCode, ip())).ok).toBe(false);
  });

  it('resend cooldown: a second request within 60s does not issue another code', async () => {
    await setup();
    await requestHistoryCode('514-555-0123', 'marie@example.com', ip(), 'fr');
    await requestHistoryCode('514-555-0123', 'marie@example.com', ip(), 'fr');
    expect(await prisma.verificationCode.count()).toBe(1);
  });

  it('throttles repeated requests per identity and per IP', async () => {
    await setup();
    const same = '10.9.9.9';
    let limited = false;
    for (let i = 0; i < 12; i++) { const r = await requestHistoryCode('514-555-0123', `x${i}@example.com`, same, 'fr'); if (!r.ok && r.reason === 'rate') limited = true; }
    expect(limited).toBe(true);
  });

  it('sessions expire', async () => {
    await setup();
    const req = await requestHistoryCode('514-555-0123', 'marie@example.com', ip(), 'fr');
    if (!req.ok || !req.devCode) throw new Error();
    const v = await verifyHistoryCode('514-555-0123', 'marie@example.com', req.devCode, ip());
    if (!v.ok) throw new Error();
    await prisma.customerSession.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await getCustomerSession(v.token)).toBeNull();
  });

  it('demo orders are not reachable once the store is live (scope isolation)', async () => {
    await setup();
    await prisma.setting.update({ where: { key: 'store' }, data: { value: { mode: 'live', onboarding: {} } } });
    const r = await requestHistoryCode('514-555-0123', 'marie@example.com', ip(), 'fr');
    expect(r).toEqual({ ok: true });
    expect(await prisma.verificationCode.count()).toBe(0);
  });
});

describe('single order recovery', () => {
  it('number + phone sends a code to the ORDER email and returns only the private link on success', async () => {
    const { a } = await setup();
    const req = await requestOrderCode(a.order.number, '514 555 0123', ip(), 'fr');
    if (!req.ok || !req.devCode) throw new Error();
    const mail = await prisma.devEmail.findFirstOrThrow({ orderBy: { createdAt: 'desc' } });
    expect(mail.to).toBe('marie@example.com');
    expect(await verifyOrderCode(a.order.number, '514-555-0123', '000000' === req.devCode ? '111111' : '000000', ip())).toEqual({ ok: false });
    const ok = await verifyOrderCode(a.order.number, '514-555-0123', req.devCode, ip());
    expect(ok).toEqual({ ok: true, publicToken: a.order.publicToken });
  });
  it('wrong phone / unknown order number respond generically and send nothing', async () => {
    const { a } = await setup();
    expect(await requestOrderCode(a.order.number, '514-555-0999', ip(), 'fr')).toEqual({ ok: true });
    expect(await requestOrderCode('DEMO-999999', '514-555-0123', ip(), 'fr')).toEqual({ ok: true });
    expect(await prisma.verificationCode.count()).toBe(0);
  });
  it('sequential order numbers are not tokens: public token is unguessable and distinct', async () => {
    const { a, b } = await setup();
    expect(a.order.publicToken).not.toContain(a.order.number);
    expect(a.order.publicToken.length).toBeGreaterThanOrEqual(30);
    expect(a.order.publicToken).not.toBe(b.order.publicToken);
  });
});

describe('email unavailable', () => {
  it('history recovery fails safely (never falls back to phone-only access)', async () => {
    await setup();
    const prev = process.env.EMAIL_PROVIDER;
    process.env.EMAIL_PROVIDER = 'resend'; // no API key configured -> provider unavailable
    delete process.env.RESEND_API_KEY;
    try {
      expect(await requestHistoryCode('514-555-0123', 'marie@example.com', ip(), 'fr')).toEqual({ ok: false, reason: 'unavailable' });
      expect(await requestOrderCode('DEMO-001001', '514-555-0123', ip(), 'fr')).toEqual({ ok: false, reason: 'unavailable' });
      expect(await prisma.customerSession.count()).toBe(0);
    } finally { process.env.EMAIL_PROVIDER = prev; }
  });
});
