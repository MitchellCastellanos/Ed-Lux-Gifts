import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '@/lib/db';
import { createOrder, applyAction } from '@/lib/orders';
import { anonymizeCustomer, runMaintenance } from '@/lib/retention';
import { showDevCodes, emailProvider, emailConfigured } from '@/lib/email';
import { requestHistoryCode } from '@/lib/verification';
import { storeImage } from '@/lib/storage';
import { patchSetting } from '@/lib/settings';
import { resetDb, fixtures, checkout, readyItem, WED } from './helpers';

beforeEach(resetDb);

describe('development helpers can never leak into production', () => {
  it('dev email adapter and dev codes are disabled when NODE_ENV=production', async () => {
    const env = process.env as Record<string, string | undefined>;
    const prev = env.NODE_ENV; const prevP = env.EMAIL_PROVIDER;
    env.NODE_ENV = 'production'; env.EMAIL_PROVIDER = 'dev';
    try {
      expect(emailProvider()).toBe('none');
      expect(showDevCodes()).toBe(false);
      expect(emailConfigured()).toBe(false);
      expect(await requestHistoryCode('514-555-0123', 'a@example.com', '9.9.9.9', 'fr')).toEqual({ ok: false, reason: 'unavailable' });
    } finally { env.NODE_ENV = prev; env.EMAIL_PROVIDER = prevP; }
  });
});

describe('image upload validation', () => {
  it('rejects wrong types, spoofed signatures and oversize files', async () => {
    expect(await storeImage(new File(['hello'], 'a.txt', { type: 'text/plain' }))).toEqual({ ok: false, error: 'type' });
    expect(await storeImage(new File(['<?php echo 1;'], 'a.jpg', { type: 'image/jpeg' }))).toEqual({ ok: false, error: 'type' });
    expect(await storeImage(new File([new Uint8Array(6 * 1024 * 1024)], 'a.png', { type: 'image/png' }))).toEqual({ ok: false, error: 'size' });
  });
});

describe('privacy: erasure and retention', () => {
  it('anonymizes personal data but keeps financial records; refuses while orders are active', async () => {
    const f = await fixtures({ stock: 5 });
    const r = await createOrder(checkout({ cart: [readyItem(f.product.id)] }), { now: WED });
    if (!r.ok) throw new Error();
    const c = await prisma.customer.findFirstOrThrow();
    expect(await anonymizeCustomer(c.id)).toEqual({ ok: false, error: 'active_orders' });
    await applyAction(r.order.id, 'cancel');
    expect(await anonymizeCustomer(c.id)).toEqual({ ok: true });
    const o = await prisma.order.findUniqueOrThrow({ where: { id: r.order.id } });
    expect(o).toMatchObject({ purchaserName: 'Client anonymisé', purchaserEmail: 'anonymise@invalid.local', totalCents: 5500 });
    expect(o.address).toBe('Anonymisé');
    expect((await prisma.customer.findUniqueOrThrow({ where: { id: c.id } })).email).toBeNull();
  });
  it('purges completed orders older than the retention period only', async () => {
    const f = await fixtures({ stock: 5 });
    const a = await createOrder(checkout({ cart: [readyItem(f.product.id)] }), { now: WED });
    const b = await createOrder(checkout({ cart: [readyItem(f.product.id)], purchaser: { phone: '514-555-0999' } }), { now: WED });
    if (!a.ok || !b.ok) throw new Error();
    await applyAction(a.order.id, 'cancel'); await applyAction(b.order.id, 'cancel');
    await patchSetting('store', { mode: 'live' }); // live customers are purged when orphaned
    await prisma.order.update({ where: { id: a.order.id }, data: { createdAt: new Date('2010-01-01') } });
    const res = await runMaintenance(new Date('2026-12-03'));
    expect(res.orders).toBe(1);
    expect(await prisma.order.count()).toBe(1);
  });
});
