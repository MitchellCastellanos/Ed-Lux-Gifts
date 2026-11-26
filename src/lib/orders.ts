import crypto from 'crypto';
import { prisma } from './db';
import { getSettings, isFictionalEmail } from './settings';
import { priceCart, type PricedCart } from './cart';
import { checkoutSchema, type CheckoutInput } from './checkout-schema';
import { normalizePhone } from './phone';
import { normalizePostalCode, postalPrefix } from './postal';
import { dateStatus } from './schedule';
import { computeTaxes, deliveryFee } from './pricing';
import { resolveCustomer } from './customers';
import { sendEmail, orderConfirmationEmail } from './email';
import { formatMoney } from './money';
import { formatDate } from './schedule';
import { rateLimit } from './rate-limit';
import type { FulfillmentStatus, PaymentMethod, Prisma, PaymentStatus } from '@prisma/client';

type Tx = Prisma.TransactionClient;

export class OrderError extends Error {
  constructor(public code: string, public details?: unknown) {
    super(code);
  }
}

export async function findZone(postal: string) {
  const prefix = postalPrefix(postal);
  const row = await prisma.deliveryZonePrefix.findUnique({ where: { prefix }, include: { zone: true } });
  return row && row.zone.active ? row.zone : null;
}

/** Reserve units atomically; the guarded UPDATE makes overselling impossible under concurrency. */
export async function reserveStock(tx: Tx, needs: Record<string, number>) {
  for (const id of Object.keys(needs).sort()) {
    const q = needs[id];
    const n = await tx.$executeRaw`UPDATE "Component" SET "stockReserved" = "stockReserved" + ${q} WHERE "id" = ${id} AND "active" = true AND "stockOnHand" - "stockReserved" >= ${q}`;
    if (n === 0) throw new OrderError('stock', { componentId: id });
  }
}

async function releaseStock(tx: Tx, orderId: string) {
  const lines = await tx.orderStockLine.findMany({ where: { orderId } });
  for (const l of lines) await tx.$executeRaw`UPDATE "Component" SET "stockReserved" = GREATEST(0, "stockReserved" - ${l.quantity}) WHERE "id" = ${l.componentId}`;
}

async function consumeStock(tx: Tx, orderId: string) {
  const lines = await tx.orderStockLine.findMany({ where: { orderId } });
  for (const l of lines) await tx.$executeRaw`UPDATE "Component" SET "stockReserved" = GREATEST(0, "stockReserved" - ${l.quantity}), "stockOnHand" = GREATEST(0, "stockOnHand" - ${l.quantity}) WHERE "id" = ${l.componentId}`;
}

async function nextOrderSeq(tx: Tx): Promise<number> {
  const rows = await tx.$queryRaw<{ value: number }[]>`INSERT INTO "Counter" ("key","value") VALUES ('order', 1001) ON CONFLICT ("key") DO UPDATE SET "value" = "Counter"."value" + 1 RETURNING "value"`;
  return rows[0].value;
}

export type CreateOrderResult =
  | { ok: true; order: { id: string; number: string; publicToken: string; totalCents: number }; duplicate: boolean }
  | { ok: false; error: 'validation'; fields: Record<string, string> }
  | { ok: false; error: 'closed' | 'zone' | 'date' | 'capacity' | 'payment' | 'stock' | 'rate' | 'cart' | 'changed' | 'not_live'; priced?: PricedCart; totalCents?: number };

export async function createOrder(raw: unknown, ctx: { ip?: string; now?: Date; siteUrl?: string } = {}): Promise<CreateOrderResult> {
  const now = ctx.now ?? new Date();
  const parsed = checkoutSchema.safeParse(raw);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const i of parsed.error.issues) fields[i.path.join('.')] = i.message;
    return { ok: false, error: 'validation', fields };
  }
  const input: CheckoutInput = parsed.data;
  if (ctx.ip && !(await rateLimit(`checkout:${ctx.ip}`, 20, 3600))) return { ok: false, error: 'rate' };

  // idempotent replay: same key returns the same order
  const existing = await prisma.order.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
  if (existing) return { ok: true, duplicate: true, order: { id: existing.id, number: existing.number, publicToken: existing.publicToken, totalCents: existing.totalCents } };

  const settings = await getSettings();
  const isDemo = settings.store.mode === 'demo';
  const pay = settings.payments;
  if (input.paymentMethod === 'INTERAC') {
    if (!pay.interacEnabled) return { ok: false, error: 'payment' };
    if (!isDemo && isFictionalEmail(pay.interacEmail)) return { ok: false, error: 'not_live' };
  } else {
    if (!pay.codEnabled) return { ok: false, error: 'payment' };
    if (input.paymentMethod === 'COD_CASH' && !pay.codCash) return { ok: false, error: 'payment' };
    if (input.paymentMethod === 'COD_INTERAC' && !pay.codInterac) return { ok: false, error: 'payment' };
  }

  const postal = normalizePostalCode(input.delivery.postalCode)!;
  const zone = await findZone(postal);
  if (!zone) return { ok: false, error: 'zone' };

  const st = dateStatus(input.delivery.deliveryDate, now, settings.schedule);
  if (st === 'paused') return { ok: false, error: 'closed' };
  if (st !== 'open') return { ok: false, error: 'date' };

  const priced = await priceCart(input.cart);
  if (!priced.ok) return { ok: false, error: 'cart', priced };
  const fee = deliveryFee(zone, priced.subtotalCents);
  const taxLines = computeTaxes(priced.subtotalCents, fee, settings.tax);
  const taxCents = taxLines.reduce((s, t) => s + t.cents, 0);
  const totalCents = priced.subtotalCents + fee + taxCents;
  if (priced.items.some((i) => i.priceChanged) || (input.expectedTotalCents != null && input.expectedTotalCents !== totalCents)) {
    return { ok: false, error: 'changed', priced, totalCents };
  }

  const phone = normalizePhone(input.purchaser.phone);
  if (!phone.ok) return { ok: false, error: 'validation', fields: { 'purchaser.phone': 'phone' } };
  const recipientPhone = input.delivery.recipientPhone ? (normalizePhone(input.delivery.recipientPhone) as any).display ?? null : null;

  try {
    const order = await prisma.$transaction(
      async (tx) => {
        // serialize capacity checks per delivery day (and demo scope)
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'delivery:' + input.delivery.deliveryDate + ':' + isDemo}))`;
        if (settings.schedule.maxOrdersPerDay > 0) {
          const n = await tx.order.count({ where: { deliveryDate: input.delivery.deliveryDate, isDemo, fulfillmentStatus: { not: 'CANCELLED' } } });
          if (n >= settings.schedule.maxOrdersPerDay) throw new OrderError('capacity');
        }
        await reserveStock(tx, priced.needs);
        const cust = await resolveCustomer(tx, { phoneE164: phone.e164, phoneDisplay: phone.display, name: input.purchaser.name, email: input.purchaser.email, locale: input.purchaser.locale, isDemo });
        const seq = await nextOrderSeq(tx);
        const number = `${isDemo ? 'DEMO' : 'EDL'}-${String(seq).padStart(6, '0')}`;
        const interac = input.paymentMethod === 'INTERAC';
        return tx.order.create({
          data: {
            number,
            publicToken: crypto.randomBytes(24).toString('base64url'),
            idempotencyKey: input.idempotencyKey,
            isDemo,
            customerId: cust.id,
            contactMismatch: cust.mismatch,
            locale: input.purchaser.locale,
            purchaserName: input.purchaser.name,
            purchaserPhoneE164: phone.e164,
            purchaserPhone: phone.display,
            purchaserEmail: input.purchaser.email,
            recipientName: input.delivery.recipientName || input.purchaser.name,
            recipientPhone,
            address: input.delivery.address,
            unit: input.delivery.unit || null,
            city: input.delivery.city,
            postalCode: postal,
            zoneId: zone.id,
            zoneName: zone.name,
            deliveryDate: input.delivery.deliveryDate,
            instructions: input.delivery.instructions,
            subtotalCents: priced.subtotalCents,
            deliveryFeeCents: fee,
            taxCents,
            taxLines,
            totalCents,
            paymentMethod: input.paymentMethod as PaymentMethod,
            paymentStatus: interac ? 'AWAITING_INTERAC' : 'DUE_ON_DELIVERY',
            reservationExpiresAt: interac ? new Date(now.getTime() + pay.interacDeadlineHours * 3600_000) : null,
            termsAcceptedAt: now,
            items: {
              create: priced.items.map((i) => ({
                kind: i.kind, productId: i.productId, nameFr: i.nameFr, nameEn: i.nameEn, imageUrl: i.imageUrl, quantity: i.quantity,
                unitCents: i.unitCents, giftMessage: i.giftMessage, contents: i.contents as any,
              })),
            },
            stockLines: { create: Object.entries(priced.needs).map(([componentId, quantity]) => ({ componentId, quantity })) },
            events: { create: { type: 'created', toValue: 'NEW', actor: 'customer' } },
          },
        });
      },
      { timeout: 20000 },
    );
    // best-effort email; failure never invalidates the order
    void sendConfirmation(order.id, ctx.siteUrl).catch(() => {});
    return { ok: true, duplicate: false, order: { id: order.id, number: order.number, publicToken: order.publicToken, totalCents: order.totalCents } };
  } catch (e: any) {
    if (e instanceof OrderError) return { ok: false, error: e.code as any, priced };
    // unique violation on the idempotency key = concurrent duplicate submission
    if (e?.code === 'P2002') {
      const dup = await prisma.order.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
      if (dup) return { ok: true, duplicate: true, order: { id: dup.id, number: dup.number, publicToken: dup.publicToken, totalCents: dup.totalCents } };
    }
    throw e;
  }
}

export async function sendConfirmation(orderId: string, siteUrl?: string) {
  const o = await prisma.order.findUnique({ where: { id: orderId } });
  if (!o) return false;
  const s = await getSettings();
  const locale = o.locale === 'en' ? 'en' : 'fr';
  const base = siteUrl ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const mail = orderConfirmationEmail({
    number: o.number, locale, totalFormatted: formatMoney(o.totalCents, locale), deliveryDateFormatted: formatDate(o.deliveryDate, locale),
    trackUrl: `${base}/${locale}/order/${o.publicToken}`,
    interac: o.paymentMethod === 'INTERAC' ? { email: s.payments.interacEmail, amount: formatMoney(o.totalCents, locale) } : null,
    cod: o.paymentMethod !== 'INTERAC',
  });
  return sendEmail({ ...mail, to: o.purchaserEmail, replyTo: s.email.replyTo || undefined });
}

// ───────────────────────── Status workflow ─────────────────────────


export type OrderAction = 'confirm' | 'markPaid' | 'prepare' | 'ready' | 'deliver' | 'deliverPaid' | 'cancel' | 'refund' | 'reactivate' | 'unpay';
export type ActionResult = { ok: true } | { ok: false; error: string };

export function allowedActions(o: { fulfillmentStatus: FulfillmentStatus; paymentStatus: PaymentStatus; paymentMethod: PaymentMethod }): OrderAction[] {
  const out: OrderAction[] = [];
  const f = o.fulfillmentStatus;
  const unpaidInterac = o.paymentMethod === 'INTERAC' && o.paymentStatus !== 'PAID';
  if (f === 'NEW') out.push('confirm');
  if (f === 'CONFIRMED' && !unpaidInterac) out.push('prepare');
  if (f === 'PREPARING') out.push('ready');
  if (f === 'READY' && !unpaidInterac) {
    out.push('deliver');
    if (o.paymentMethod !== 'INTERAC' && o.paymentStatus === 'DUE_ON_DELIVERY') out.push('deliverPaid');
  }
  if (['AWAITING_INTERAC', 'DUE_ON_DELIVERY'].includes(o.paymentStatus) && f !== 'CANCELLED') out.push('markPaid');
  if (!['DELIVERED', 'CANCELLED'].includes(f)) out.push('cancel');
  if (f === 'CANCELLED' && o.paymentStatus === 'PAID') out.push('refund');
  if (f === 'CANCELLED' && o.paymentStatus === 'EXPIRED') out.push('reactivate');
  return out;
}

export async function applyAction(orderId: string, action: OrderAction, opts: { actor: string; note?: string; now?: Date } = { actor: 'admin' }): Promise<ActionResult> {
  const now = opts.now ?? new Date();
  const settings = await getSettings();
  try {
    return await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
      const o = await tx.order.findUnique({ where: { id: orderId } });
      if (!o) return { ok: false as const, error: 'not_found' };
      if (!allowedActions(o).includes(action)) return { ok: false as const, error: 'transition' };
      const data: Prisma.OrderUpdateInput = {};
      const events: { type: string; from?: string; to?: string; note?: string }[] = [];
      const setF = (f: FulfillmentStatus) => { data.fulfillmentStatus = f; events.push({ type: 'fulfillment', from: o.fulfillmentStatus, to: f }); };
      const setP = (p: PaymentStatus) => { data.paymentStatus = p; events.push({ type: 'payment', from: o.paymentStatus, to: p }); if (p === 'PAID') data.paidAt = now; };
      switch (action) {
        case 'confirm': setF('CONFIRMED'); break;
        case 'markPaid':
          setP('PAID');
          if (o.fulfillmentStatus === 'NEW') setF('CONFIRMED'); // verified payment confirms the order
          break;
        case 'prepare': setF('PREPARING'); break;
        case 'ready': setF('READY'); break;
        case 'deliver':
        case 'deliverPaid':
          setF('DELIVERED'); data.deliveredAt = now;
          if (action === 'deliverPaid') setP('PAID');
          if (o.inventoryState === 'RESERVED') { await consumeStock(tx, o.id); data.inventoryState = 'CONSUMED'; }
          break;
        case 'cancel':
          setF('CANCELLED'); data.cancelReason = opts.note ?? 'ADMIN';
          if (o.inventoryState === 'RESERVED') { await releaseStock(tx, o.id); data.inventoryState = 'RELEASED'; }
          break;
        case 'refund': setP('REFUNDED'); break;
        case 'reactivate': {
          const lines = await tx.orderStockLine.findMany({ where: { orderId: o.id } });
          const needs: Record<string, number> = {};
          lines.forEach((l) => (needs[l.componentId] = l.quantity));
          await reserveStock(tx, needs); // throws 'stock' if the units were sold meanwhile
          data.inventoryState = 'RESERVED';
          data.cancelReason = null;
          data.reservationExpiresAt = new Date(now.getTime() + settings.payments.interacDeadlineHours * 3600_000);
          setF('NEW'); setP('AWAITING_INTERAC');
          break;
        }
      }
      await tx.order.update({ where: { id: orderId }, data });
      for (const e of events) await tx.orderEvent.create({ data: { orderId, type: e.type, fromValue: e.from, toValue: e.to, note: e.note ?? opts.note ?? '', actor: opts.actor } });
      if (!events.length) await tx.orderEvent.create({ data: { orderId, type: action, actor: opts.actor } });
      return { ok: true as const };
    });
  } catch (e) {
    if (e instanceof OrderError) return { ok: false, error: e.code };
    throw e;
  }
}

/** Release reservations of unpaid Interac orders past their deadline. Safe to call repeatedly and concurrently. */
export async function expireReservations(now = new Date()): Promise<number> {
  const ids = await prisma.order.findMany({
    where: { paymentMethod: 'INTERAC', paymentStatus: 'AWAITING_INTERAC', inventoryState: 'RESERVED', reservationExpiresAt: { lt: now }, fulfillmentStatus: { notIn: ['DELIVERED', 'CANCELLED'] } },
    select: { id: true },
    take: 200,
  });
  let n = 0;
  for (const { id } of ids) {
    const done = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT id FROM "Order" WHERE id = ${id} FOR UPDATE`;
      const o = await tx.order.findUnique({ where: { id } });
      if (!o || o.paymentStatus !== 'AWAITING_INTERAC' || o.inventoryState !== 'RESERVED') return false;
      await releaseStock(tx, id);
      await tx.order.update({ where: { id }, data: { paymentStatus: 'EXPIRED', fulfillmentStatus: 'CANCELLED', inventoryState: 'RELEASED', cancelReason: 'EXPIRED' } });
      await tx.orderEvent.create({ data: { orderId: id, type: 'expired', fromValue: 'AWAITING_INTERAC', toValue: 'EXPIRED', note: 'Interac payment deadline passed', actor: 'system' } });
      return true;
    });
    if (done) n++;
  }
  return n;
}

export async function addNote(orderId: string, notes: string) {
  await prisma.order.update({ where: { id: orderId }, data: { internalNotes: notes.slice(0, 2000) } });
}

// ───────────────────────── Stock adjustments ─────────────────────────

export async function adjustStock(componentId: string, p: { delta?: number; setTo?: number; reason?: string; actor: string }): Promise<ActionResult> {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ stockOnHand: number; stockReserved: number }[]>`SELECT "stockOnHand","stockReserved" FROM "Component" WHERE id = ${componentId} FOR UPDATE`;
    if (!rows[0]) return { ok: false as const, error: 'not_found' };
    const next = p.setTo != null ? p.setTo : rows[0].stockOnHand + (p.delta ?? 0);
    if (!Number.isInteger(next) || next < 0) return { ok: false as const, error: 'negative' };
    if (next < rows[0].stockReserved) return { ok: false as const, error: 'reserved' };
    await tx.component.update({ where: { id: componentId }, data: { stockOnHand: next } });
    await tx.stockAdjustment.create({ data: { componentId, delta: next - rows[0].stockOnHand, newOnHand: next, reason: p.reason ?? '', actor: p.actor } });
    return { ok: true as const };
  });
}
