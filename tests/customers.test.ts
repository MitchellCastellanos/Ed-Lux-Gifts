import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '@/lib/db';
import { createOrder } from '@/lib/orders';
import { searchCustomers, updateCustomerPhone, reassignOrder } from '@/lib/customers';
import { resetDb, fixtures, checkout, readyItem, WED } from './helpers';

beforeEach(resetDb);
const place = (f: Awaited<ReturnType<typeof fixtures>>, over: Record<string, any> = {}) => createOrder(checkout({ cart: [readyItem(f.product.id)], ...over }), { now: WED });

describe('phone-first customer identity', () => {
  it('different phone formats resolve to ONE customer and keep all orders together', async () => {
    const f = await fixtures({ stock: 20 });
    for (const phone of ['514-555-0123', '(514) 555-0123', '5145550123', '+1 514 555 0123']) expect((await place(f, { purchaser: { phone } })).ok).toBe(true);
    const customers = await prisma.customer.findMany();
    expect(customers).toHaveLength(1);
    expect(customers[0].phoneE164).toBe('+15145550123');
    expect(await prisma.order.count({ where: { customerId: customers[0].id } })).toBe(4);
  });

  it('concurrent first orders for the same phone create exactly one customer', async () => {
    const f = await fixtures({ stock: 20 });
    const rs = await Promise.all(Array.from({ length: 8 }, (_, i) => place(f, { purchaser: { phone: i % 2 ? '514 555 0123' : '(514) 555-0123', email: 'same@example.com' } })));
    expect(rs.every((r) => r.ok)).toBe(true);
    expect(await prisma.customer.count()).toBe(1);
    expect(await prisma.order.count()).toBe(8);
  });

  it('recipient phone is stored on the order but never creates or identifies a customer', async () => {
    const f = await fixtures();
    const r = await place(f, { delivery: { recipientName: 'Jane', recipientPhone: '438-555-0199' } });
    expect(r.ok).toBe(true);
    expect(await prisma.customer.count()).toBe(1);
    expect(await prisma.customer.count({ where: { phoneE164: '+14385550199' } })).toBe(0);
    const o = await prisma.order.findFirstOrThrow();
    expect(o.purchaserPhoneE164).toBe('+15145550123');
    expect(o.recipientPhone).toContain('555-0199');
  });

  it('rejects invalid purchaser phone on the server', async () => {
    const f = await fixtures();
    expect(await place(f, { purchaser: { phone: '12' } })).toMatchObject({ ok: false, error: 'validation' });
    expect(await prisma.customer.count()).toBe(0);
  });

  it('shared number with different name/email: order keeps its own snapshot, customer record is NOT overwritten, discrepancy flagged', async () => {
    const f = await fixtures({ stock: 5 });
    await place(f, { purchaser: { name: 'Marie', email: 'marie@example.com' } });
    const r2 = await place(f, { purchaser: { name: 'Luc', email: 'luc@example.com', phone: '(514) 555-0123' } });
    if (!r2.ok) throw new Error();
    const c = await prisma.customer.findFirstOrThrow();
    expect(c).toMatchObject({ name: 'Marie', email: 'marie@example.com' });
    const o = await prisma.order.findUniqueOrThrow({ where: { id: r2.order.id } });
    expect(o).toMatchObject({ purchaserName: 'Luc', purchaserEmail: 'luc@example.com', contactMismatch: true, customerId: c.id });
  });

  it('keeps the historical contact snapshot when the customer record is corrected', async () => {
    const f = await fixtures();
    const r = await place(f);
    if (!r.ok) throw new Error();
    const c = await prisma.customer.findFirstOrThrow();
    await prisma.customer.update({ where: { id: c.id }, data: { name: 'Renamed', email: 'new@example.com' } });
    expect(await updateCustomerPhone(c.id, '514-555-0777')).toEqual({ ok: true });
    const o = await prisma.order.findUniqueOrThrow({ where: { id: r.order.id } });
    expect(o).toMatchObject({ purchaserName: 'Test Buyer', purchaserEmail: 'buyer@example.com', purchaserPhoneE164: '+15145550123', customerId: c.id });
  });

  it('phone correction detects collisions and never silently merges', async () => {
    const f = await fixtures({ stock: 5 });
    await place(f, { purchaser: { phone: '514-555-0001' } });
    await place(f, { purchaser: { phone: '514-555-0002', name: 'Other' } });
    const [a, b] = await prisma.customer.findMany({ orderBy: { phoneE164: 'asc' } });
    const res = await updateCustomerPhone(a.id, '(514) 555-0002');
    expect(res).toEqual({ ok: false, error: 'collision', collisionId: b.id });
    expect(await prisma.customer.count()).toBe(2);
    expect(await updateCustomerPhone(a.id, 'nope')).toMatchObject({ ok: false, error: 'invalid' });
  });

  it('an order can be moved to the right customer without touching its snapshot', async () => {
    const f = await fixtures({ stock: 5 });
    const r1 = await place(f, { purchaser: { phone: '514-555-0001' } });
    await place(f, { purchaser: { phone: '514-555-0002', name: 'Other' } });
    const target = await prisma.customer.findFirstOrThrow({ where: { phoneE164: '+15145550002' } });
    if (!r1.ok) throw new Error();
    expect(await reassignOrder(r1.order.id, target.id)).toBe(true);
    const o = await prisma.order.findUniqueOrThrow({ where: { id: r1.order.id } });
    expect(o.customerId).toBe(target.id);
    expect(o.purchaserPhoneE164).toBe('+15145550001');
  });
});

describe('admin customer search', () => {
  it('finds by formatted, normalized and partial phone, name and email; across all dates', async () => {
    const f = await fixtures({ stock: 10 });
    await place(f, { purchaser: { phone: '514-555-0123', name: 'Marie Tremblay', email: 'marie@example.com' } });
    await place(f, { purchaser: { phone: '(514) 555-0123' } });
    await place(f, { purchaser: { phone: '438-555-0177', name: 'Sophie Lavoie', email: 'sophie@example.com' } });
    for (const q of ['(514) 555-0123', '+15145550123', '5145550123', '555-0123', '0123', 'Marie', 'tremblay', 'marie@example']) {
      const hits = await searchCustomers(q);
      expect(hits.map((h) => h.phoneE164), q).toContain('+15145550123');
      expect(hits.find((h) => h.phoneE164 === '+15145550123')?.orderCount).toBe(2);
    }
    expect((await searchCustomers('438')).map((h) => h.name)).toContain('Sophie Lavoie');
    expect(await searchCustomers('9')).toEqual([]);
  });
});

describe('demo isolation', () => {
  it('demo and live customers with the same phone are separate records', async () => {
    const f = await fixtures({ stock: 5 });
    await place(f); // demo (default mode)
    await prisma.setting.update({ where: { key: 'store' }, data: { value: { mode: 'live', onboarding: {} } } });
    await prisma.setting.update({ where: { key: 'payments' }, data: { value: { ...(await prisma.setting.findUniqueOrThrow({ where: { key: 'payments' } })).value as object, interacEmail: 'real@shop.ca' } } });
    expect((await place(f)).ok).toBe(true);
    const cs = await prisma.customer.findMany();
    expect(cs).toHaveLength(2);
    expect(cs.map((c) => c.isDemo).sort()).toEqual([false, true]);
  });
});
