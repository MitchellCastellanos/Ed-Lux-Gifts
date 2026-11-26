import { prisma } from './db';
import { normalizePhone, phoneDigits, formatPhone } from './phone';
import type { Prisma } from '@prisma/client';

type Tx = Prisma.TransactionClient;

/** Atomically find-or-create the operational customer for a phone. Never overwrites existing name/email. */
export async function resolveCustomer(tx: Tx, p: { phoneE164: string; phoneDisplay: string; name: string; email: string; locale: string; isDemo: boolean }) {
  const rows = await tx.$queryRaw<{ id: string; name: string; email: string | null; created: boolean }[]>`
    INSERT INTO "Customer" ("id","phoneE164","phoneDisplay","name","email","locale","isDemo","createdAt","lastActivityAt")
    VALUES (gen_random_uuid()::text, ${p.phoneE164}, ${p.phoneDisplay}, ${p.name}, ${p.email}, ${p.locale}, ${p.isDemo}, now(), now())
    ON CONFLICT ("phoneE164","isDemo") DO UPDATE SET "lastActivityAt" = now()
    RETURNING "id","name","email",(xmax = 0) AS created`;
  const c = rows[0];
  const norm = (s: string | null) => (s ?? '').trim().toLowerCase();
  const mismatch = !c.created && (norm(c.name) !== norm(p.name) || (c.email != null && norm(c.email) !== norm(p.email)));
  return { id: c.id, created: c.created, mismatch };
}

export type CustomerHit = { id: string; name: string; phoneDisplay: string; phoneE164: string; email: string | null; orderCount: number; isDemo: boolean };

/** Admin search over customers: phone (any format, partial), name, email. */
export async function searchCustomers(q: string): Promise<CustomerHit[]> {
  const term = q.trim();
  if (term.length < 2) return [];
  const digits = phoneDigits(term);
  const norm = normalizePhone(term);
  const or: Prisma.CustomerWhereInput[] = [
    { name: { contains: term, mode: 'insensitive' } },
    { email: { contains: term, mode: 'insensitive' } },
  ];
  if (norm.ok) or.push({ phoneE164: norm.e164 });
  // partial phone: match any digits fragment against the E.164 digits
  if (digits.length >= 3 && /^[\d\s()+.-]+$/.test(term)) or.push({ phoneE164: { contains: digits } });
  const rows = await prisma.customer.findMany({ where: { OR: or }, include: { _count: { select: { orders: true } } }, orderBy: { lastActivityAt: 'desc' }, take: 20 });
  return rows.map((c) => ({ id: c.id, name: c.name, phoneDisplay: c.phoneDisplay, phoneE164: c.phoneE164, email: c.email, orderCount: c._count.orders, isDemo: c.isDemo }));
}

export type PhoneChangeResult = { ok: true } | { ok: false; error: 'invalid' | 'collision'; collisionId?: string };

/** Change a customer's phone. Never merges: if the number belongs to another customer, report the collision. */
export async function updateCustomerPhone(customerId: string, newPhone: string): Promise<PhoneChangeResult> {
  const n = normalizePhone(newPhone);
  if (!n.ok) return { ok: false, error: 'invalid' };
  return prisma.$transaction(async (tx) => {
    const cur = await tx.customer.findUnique({ where: { id: customerId } });
    if (!cur) return { ok: false as const, error: 'invalid' as const };
    const other = await tx.customer.findFirst({ where: { phoneE164: n.e164, isDemo: cur.isDemo, NOT: { id: customerId } } });
    if (other) return { ok: false as const, error: 'collision' as const, collisionId: other.id };
    await tx.customer.update({ where: { id: customerId }, data: { phoneE164: n.e164, phoneDisplay: n.display } });
    return { ok: true as const };
  });
}

/** Move one order to another customer (fixes an incorrect association). The order's contact snapshot is untouched. */
export async function reassignOrder(orderId: string, targetCustomerId: string) {
  const [o, c] = await Promise.all([prisma.order.findUnique({ where: { id: orderId } }), prisma.customer.findUnique({ where: { id: targetCustomerId } })]);
  if (!o || !c || o.isDemo !== c.isDemo) return false;
  await prisma.$transaction([
    prisma.order.update({ where: { id: orderId }, data: { customerId: c.id, contactMismatch: false } }),
    prisma.orderEvent.create({ data: { orderId, type: 'reassigned', fromValue: o.customerId, toValue: c.id, actor: 'admin' } }),
  ]);
  return true;
}

export { formatPhone };

/** Move an order to the customer owning `phone` (created if missing). Used to fix wrong associations; never merges customers. */
export async function moveOrderToPhone(orderId: string, phoneInput: string): Promise<{ ok: true; customerId: string } | { ok: false; error: 'invalid' | 'not_found' }> {
  const n = normalizePhone(phoneInput);
  if (!n.ok) return { ok: false, error: 'invalid' };
  const o = await prisma.order.findUnique({ where: { id: orderId } });
  if (!o) return { ok: false, error: 'not_found' };
  return prisma.$transaction(async (tx) => {
    const c = await resolveCustomer(tx, { phoneE164: n.e164, phoneDisplay: n.display, name: o.purchaserName, email: o.purchaserEmail, locale: o.locale, isDemo: o.isDemo });
    await tx.order.update({ where: { id: orderId }, data: { customerId: c.id, contactMismatch: false } });
    await tx.orderEvent.create({ data: { orderId, type: 'reassigned', fromValue: o.customerId, toValue: c.id, actor: 'admin' } });
    return { ok: true as const, customerId: c.id };
  });
}
