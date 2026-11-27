import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '@/lib/db';
import { createOrder, applyAction, expireReservations, adjustStock } from '@/lib/orders';
import { productStock, productInclude } from '@/lib/catalog';
import { saveSetting, getSettings, patchSetting } from '@/lib/settings';
import { resetDb, fixtures, checkout, readyItem, customItem, WED, SAT, SUN } from './helpers';

const stockOf = async (id: string) => prisma.component.findUniqueOrThrow({ where: { id } });
const place = (over: Record<string, any>, now = WED) => createOrder(checkout(over), { now });

beforeEach(resetDb);

describe('shared inventory', () => {
  it('ready-made availability comes from the recipe and the same stock as custom baskets', async () => {
    const f = await fixtures({ stock: 3 });
    const p = async () => productStock((await prisma.product.findUniqueOrThrow({ where: { id: f.product.id }, include: productInclude })));
    expect(await p()).toBe(3);
    // a custom basket using 2 chocolates reduces what the ready-made basket can offer
    const r = await place({ cart: [customItem(f.base.id, [{ componentId: f.choc.id, quantity: 2 }])] });
    expect(r.ok).toBe(true);
    expect(await p()).toBe(1);
    // and the ready-made basket consumes the same pool
    expect((await place({ cart: [readyItem(f.product.id)], purchaser: { phone: '514-555-0200' } })).ok).toBe(true);
    expect(await p()).toBe(0);
    const again = await place({ cart: [readyItem(f.product.id)], purchaser: { phone: '514-555-0201' } });
    expect(again).toMatchObject({ ok: false, error: 'cart' });
  });

  it('prevents overselling under concurrency (exactly `stock` orders succeed)', async () => {
    const f = await fixtures({ stock: 3 });
    const results = await Promise.all(Array.from({ length: 10 }, (_, i) => place({ cart: [readyItem(f.product.id)], purchaser: { phone: `514-555-03${String(i).padStart(2, '0')}`, email: `c${i}@example.com` } })));
    expect(results.filter((r) => r.ok).length).toBe(3);
    const c = await stockOf(f.choc.id);
    expect(c.stockReserved).toBe(3);
    expect(c.stockOnHand).toBe(3);
  });

  it('cancellation restores reserved stock exactly once', async () => {
    const f = await fixtures();
    const r = await place({ cart: [readyItem(f.product.id, 2)] });
    if (!r.ok) throw new Error('order failed');
    expect((await stockOf(f.choc.id)).stockReserved).toBe(2);
    expect(await applyAction(r.order.id, 'cancel')).toEqual({ ok: true });
    expect((await stockOf(f.choc.id)).stockReserved).toBe(0);
    expect(await applyAction(r.order.id, 'cancel')).toMatchObject({ ok: false });
    expect((await stockOf(f.choc.id)).stockReserved).toBe(0);
  });

  it('delivery consumes stock once; later transitions never decrement twice', async () => {
    const f = await fixtures();
    const r = await place({ cart: [readyItem(f.product.id)], paymentMethod: 'COD_CASH' });
    if (!r.ok) throw new Error();
    for (const a of ['confirm', 'prepare', 'ready', 'deliverPaid'] as const) expect(await applyAction(r.order.id, a)).toEqual({ ok: true });
    const c = await stockOf(f.choc.id);
    expect(c).toMatchObject({ stockOnHand: 9, stockReserved: 0 });
    expect(await applyAction(r.order.id, 'deliver')).toMatchObject({ ok: false });
    expect(await applyAction(r.order.id, 'cancel')).toMatchObject({ ok: false });
    expect((await stockOf(f.choc.id)).stockOnHand).toBe(9);
  });

  it('stock adjustments cannot go negative or below reserved, and are logged', async () => {
    const f = await fixtures({ stock: 5 });
    await place({ cart: [readyItem(f.product.id, 2)] });
    expect(await adjustStock(f.choc.id, { delta: -4, actor: 't' })).toEqual({ ok: false, error: 'reserved' });
    expect(await adjustStock(f.choc.id, { delta: -99, actor: 't' })).toMatchObject({ ok: false });
    expect(await adjustStock(f.choc.id, { delta: 5, actor: 't', reason: 'restock' })).toEqual({ ok: true });
    expect((await stockOf(f.choc.id)).stockOnHand).toBe(10);
    expect(await prisma.stockAdjustment.count({ where: { componentId: f.choc.id } })).toBe(1);
  });
});

describe('payments & reservation expiry', () => {
  it('Interac reservations expire; stock returns; order marked expired and reactivatable', async () => {
    const f = await fixtures();
    const r = await place({ cart: [readyItem(f.product.id)] });
    if (!r.ok) throw new Error();
    expect(await expireReservations(new Date(WED.getTime() + 47 * 3600_000))).toBe(0);
    expect(await expireReservations(new Date(WED.getTime() + 49 * 3600_000))).toBe(1);
    const o = await prisma.order.findUniqueOrThrow({ where: { id: r.order.id } });
    expect(o).toMatchObject({ paymentStatus: 'EXPIRED', fulfillmentStatus: 'CANCELLED', inventoryState: 'RELEASED' });
    expect((await stockOf(f.choc.id)).stockReserved).toBe(0);
    expect(await expireReservations(new Date(WED.getTime() + 99 * 3600_000))).toBe(0); // idempotent
    // late transfer: owner reactivates, then marks paid
    expect(await applyAction(r.order.id, 'reactivate')).toEqual({ ok: true });
    expect((await stockOf(f.choc.id)).stockReserved).toBe(1);
    expect(await applyAction(r.order.id, 'markPaid')).toEqual({ ok: true });
  });

  it('reactivation fails safely if the stock was sold meanwhile', async () => {
    const f = await fixtures({ stock: 1 });
    const r = await place({ cart: [readyItem(f.product.id)] });
    if (!r.ok) throw new Error();
    await expireReservations(new Date(WED.getTime() + 49 * 3600_000));
    expect((await place({ cart: [readyItem(f.product.id)], purchaser: { phone: '514-555-0400' } })).ok).toBe(true);
    expect(await applyAction(r.order.id, 'reactivate')).toEqual({ ok: false, error: 'stock' });
  });

  it('payment-on-delivery orders are never expired by the Interac policy', async () => {
    const f = await fixtures();
    const r = await place({ cart: [readyItem(f.product.id)], paymentMethod: 'COD_CASH' });
    if (!r.ok) throw new Error();
    expect(await expireReservations(new Date(WED.getTime() + 999 * 3600_000))).toBe(0);
    const o = await prisma.order.findUniqueOrThrow({ where: { id: r.order.id } });
    expect(o).toMatchObject({ paymentStatus: 'DUE_ON_DELIVERY', fulfillmentStatus: 'NEW', reservationExpiresAt: null });
  });

  it('unpaid Interac orders cannot be prepared or delivered; marking paid confirms', async () => {
    const f = await fixtures();
    const r = await place({ cart: [readyItem(f.product.id)] });
    if (!r.ok) throw new Error();
    expect(await applyAction(r.order.id, 'prepare')).toMatchObject({ ok: false });
    expect(await applyAction(r.order.id, 'markPaid')).toEqual({ ok: true });
    expect((await prisma.order.findUniqueOrThrow({ where: { id: r.order.id } })).fulfillmentStatus).toBe('CONFIRMED');
    expect(await applyAction(r.order.id, 'prepare')).toEqual({ ok: true });
    expect((await prisma.orderEvent.count({ where: { orderId: r.order.id } }))).toBeGreaterThanOrEqual(4);
  });

  it('respects disabled payment methods', async () => {
    const f = await fixtures();
    await patchSetting('payments', { interacEnabled: false });
    expect(await place({ cart: [readyItem(f.product.id)], paymentMethod: 'INTERAC' })).toMatchObject({ ok: false, error: 'payment' });
    await patchSetting('payments', { interacEnabled: true, codEnabled: false });
    expect(await place({ cart: [readyItem(f.product.id)], paymentMethod: 'COD_CASH' })).toMatchObject({ ok: false, error: 'payment' });
    await patchSetting('payments', { codEnabled: true });
    expect((await place({ cart: [readyItem(f.product.id)], paymentMethod: 'COD_CASH' })).ok).toBe(true);
  });

  it('payment on delivery is cash only: Interac-at-delivery is rejected server-side', async () => {
    const f = await fixtures();
    expect(await place({ cart: [readyItem(f.product.id)], paymentMethod: 'COD_INTERAC' })).toMatchObject({ ok: false, error: 'validation' });
    expect(await prisma.order.count()).toBe(0);
  });

  it('live mode refuses Interac orders until a real (non-fictional) Interac address is configured', async () => {
    const f = await fixtures();
    await patchSetting('store', { mode: 'live' });
    expect(await place({ cart: [readyItem(f.product.id)] })).toMatchObject({ ok: false, error: 'not_live' });
    await patchSetting('payments', { interacEmail: 'owner@real-business.ca' });
    const r = await place({ cart: [readyItem(f.product.id)] });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.order.number).toMatch(/^EDL-\d{6}$/);
  });

  it('is idempotent: repeated and concurrent submissions create one order', async () => {
    const f = await fixtures();
    const body = checkout({ cart: [readyItem(f.product.id)] });
    const rs = await Promise.all([1, 2, 3, 4].map(() => createOrder(body, { now: WED })));
    expect(rs.every((r) => r.ok)).toBe(true);
    expect(new Set(rs.map((r) => r.ok && r.order.number)).size).toBe(1);
    expect(await prisma.order.count()).toBe(1);
    expect((await stockOf(f.choc.id)).stockReserved).toBe(1);
  });
});

describe('delivery rules', () => {
  it('enforces the Friday 1 PM cutoff server-side', async () => {
    const f = await fixtures();
    const cart = [readyItem(f.product.id)];
    expect((await place({ cart }, new Date('2026-12-04T17:59:00Z'))).ok).toBe(true);
    expect(await place({ cart, purchaser: { phone: '514-555-0500' } }, new Date('2026-12-04T18:01:00Z'))).toMatchObject({ ok: false, error: 'date' });
    expect((await place({ cart, purchaser: { phone: '514-555-0500' }, delivery: { deliveryDate: '2026-12-12' } }, new Date('2026-12-04T18:01:00Z'))).ok).toBe(true);
  });
  it('rejects non-delivery days, closed weekends and a paused store', async () => {
    const f = await fixtures();
    const cart = [readyItem(f.product.id)];
    expect(await place({ cart, delivery: { deliveryDate: '2026-12-03' } })).toMatchObject({ ok: false, error: 'date' });
    await patchSetting('schedule', { closedDates: [SAT, SUN] });
    expect(await place({ cart })).toMatchObject({ ok: false, error: 'date' });
    await patchSetting('schedule', { closedDates: [], ordersOpen: false });
    expect(await place({ cart })).toMatchObject({ ok: false, error: 'closed' });
  });
  it('enforces delivery-day capacity under concurrency', async () => {
    const f = await fixtures({ stock: 50 });
    await patchSetting('schedule', { maxOrdersPerDay: 3 });
    const rs = await Promise.all(Array.from({ length: 8 }, (_, i) => place({ cart: [readyItem(f.product.id)], purchaser: { phone: `514-555-06${String(i).padStart(2, '0')}`, email: `d${i}@example.com` } })));
    expect(rs.filter((r) => r.ok).length).toBe(3);
    expect(rs.filter((r) => !r.ok && r.error === 'capacity').length).toBe(5);
    // cancelled orders free capacity
    const first = rs.find((r) => r.ok);
    if (first?.ok) await applyAction(first.order.id, 'cancel');
    expect((await place({ cart: [readyItem(f.product.id)], purchaser: { phone: '514-555-0699' } })).ok).toBe(true);
  });
  it('matches zones by postal prefix, rejects unsupported/disabled zones, computes the fee', async () => {
    const f = await fixtures();
    const cart = [readyItem(f.product.id)];
    const ok = await place({ cart, delivery: { postalCode: 'H9S-2B2' } });
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.order.totalCents).toBe(5000 + 500);
    expect(await place({ cart, delivery: { postalCode: 'M5V 2T6' }, purchaser: { phone: '514-555-0701' } })).toMatchObject({ ok: false, error: 'zone' });
    expect(await place({ cart, delivery: { postalCode: 'ZZZ' }, purchaser: { phone: '514-555-0702' } })).toMatchObject({ ok: false, error: 'validation' });
    await prisma.deliveryZone.update({ where: { id: f.zone.id }, data: { active: false } });
    expect(await place({ cart, purchaser: { phone: '514-555-0703' } })).toMatchObject({ ok: false, error: 'zone' });
  });
  it('freezes the delivery fee on historical orders when rates change', async () => {
    const f = await fixtures();
    const r = await place({ cart: [readyItem(f.product.id)] });
    if (!r.ok) throw new Error();
    await prisma.deliveryZone.update({ where: { id: f.zone.id }, data: { feeCents: 2500 } });
    const o = await prisma.order.findUniqueOrThrow({ where: { id: r.order.id } });
    expect(o.deliveryFeeCents).toBe(500);
    expect(o.totalCents).toBe(5500);
    const r2 = await place({ cart: [readyItem(f.product.id)], purchaser: { phone: '514-555-0800' } });
    if (r2.ok) expect(r2.order.totalCents).toBe(7500);
  });
  it('adds taxes only when configured and preserves them on the order', async () => {
    const f = await fixtures();
    await patchSetting('tax', { mode: 'gst_qst' });
    const r = await place({ cart: [readyItem(f.product.id)] });
    if (!r.ok) throw new Error();
    const o = await prisma.order.findUniqueOrThrow({ where: { id: r.order.id } });
    expect(o.taxCents).toBe(Math.round(5500 * 0.05) + Math.round(5500 * 0.09975));
    expect(o.totalCents).toBe(5500 + o.taxCents);
  });
});

describe('server-side pricing', () => {
  it('ignores client prices: custom total is recomputed; stale prices and capacity are rejected', async () => {
    const f = await fixtures();
    // base 20.00 (ribbon included) + 2 × choc 10.00 (capacity 4/6) + card 3.00
    const cart = [customItem(f.base.id, [{ componentId: f.choc.id, quantity: 2 }], [f.ribbon.id, f.card.id])];
    const r = await place({ cart });
    if (!r.ok) throw new Error(JSON.stringify(r));
    const o = await prisma.order.findUniqueOrThrow({ where: { id: r.order.id }, include: { items: true } });
    expect(o.items[0].unitCents).toBe(2000 + 2000 + 300);
    expect(o.subtotalCents).toBe(4300);
    // over capacity: 2 candles = 6 pts + 1 choc = 8 > 6
    const over = await place({ cart: [customItem(f.base.id, [{ componentId: f.candle.id, quantity: 2 }, { componentId: f.choc.id, quantity: 1 }])], purchaser: { phone: '514-555-0900' } });
    expect(over).toMatchObject({ ok: false, error: 'cart' });
    // customer saw an old price -> must reconfirm
    const changed = await place({ cart: [{ ...readyItem(f.product.id), seenUnitCents: 4000 }], purchaser: { phone: '514-555-0901' } });
    expect(changed).toMatchObject({ ok: false, error: 'changed' });
    const wrongTotal = await place({ cart: [readyItem(f.product.id)], expectedTotalCents: 1, purchaser: { phone: '514-555-0902' } });
    expect(wrongTotal).toMatchObject({ ok: false, error: 'changed' });
  });
  it('mixed carts (ready-made + custom) reserve all components together', async () => {
    const f = await fixtures({ stock: 3 });
    const r = await place({ cart: [readyItem(f.product.id, 2), customItem(f.base.id, [{ componentId: f.choc.id, quantity: 1 }])] });
    expect(r.ok).toBe(true);
    expect((await stockOf(f.choc.id)).stockReserved).toBe(3);
    const nope = await place({ cart: [readyItem(f.product.id, 2), customItem(f.base.id, [{ componentId: f.choc.id, quantity: 2 }])], purchaser: { phone: '514-555-0990' } });
    expect(nope).toMatchObject({ ok: false, error: 'cart' });
  });
  it('archiving a product keeps historical order snapshots', async () => {
    const f = await fixtures();
    const r = await place({ cart: [readyItem(f.product.id)] });
    if (!r.ok) throw new Error();
    await prisma.product.update({ where: { id: f.product.id }, data: { archived: true, nameFr: 'Renommé', priceCents: 9999 } });
    const o = await prisma.order.findUniqueOrThrow({ where: { id: r.order.id }, include: { items: true } });
    expect(o.items[0]).toMatchObject({ nameFr: 'Test', unitCents: 5000 });
  });
});
