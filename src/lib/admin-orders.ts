import type { Prisma } from '@prisma/client';
import { prisma } from './db';
import { getSettings } from './settings';
import { normalizePhone, phoneDigits } from './phone';
import { searchCustomers, type CustomerHit } from './customers';
import { businessToday, candidateDates, groupByCycle } from './schedule';

export const FILTERS = ['all', 'new', 'awaiting', 'prepare', 'ready', 'delivered', 'cancelled'] as const;
export type OrderFilter = (typeof FILTERS)[number];

export function filterWhere(f: OrderFilter): Prisma.OrderWhereInput {
  switch (f) {
    case 'new': return { fulfillmentStatus: 'NEW' };
    case 'awaiting': return { paymentStatus: 'AWAITING_INTERAC', fulfillmentStatus: { not: 'CANCELLED' } };
    case 'prepare': return { fulfillmentStatus: { in: ['CONFIRMED', 'PREPARING'] } };
    case 'ready': return { fulfillmentStatus: 'READY' };
    case 'delivered': return { fulfillmentStatus: 'DELIVERED' };
    case 'cancelled': return { fulfillmentStatus: 'CANCELLED' };
    default: return {};
  }
}

export type OrderRow = {
  id: string; number: string; customerId: string; name: string; phone: string; phoneE164: string; deliveryDate: string; zoneName: string;
  totalCents: number; paymentStatus: string; fulfillmentStatus: string; paymentMethod: string; createdAt: string; isDemo: boolean; mismatch: boolean;
};

export type WorkspaceData = {
  counters: { newCount: number; unpaid: number; toPrepare: number; deliveriesLeft: number };
  weekend: string[]; ordersOpen: boolean; mode: 'demo' | 'live';
  orders: OrderRow[]; customers: CustomerHit[]; updatedAt: string;
};

export async function queryWorkspace(p: { filter: OrderFilter; q?: string; date?: string; pay?: string }, now = new Date()): Promise<WorkspaceData> {
  const s = await getSettings();
  const isDemo = s.store.mode === 'demo';
  const base: Prisma.OrderWhereInput = { isDemo };
  const and: Prisma.OrderWhereInput[] = [base, filterWhere(p.filter)];
  if (p.date) and.push({ deliveryDate: p.date });
  if (p.pay && ['INTERAC', 'COD_CASH', 'COD_INTERAC'].includes(p.pay)) and.push({ paymentMethod: p.pay as any });

  const q = (p.q ?? '').trim();
  let customers: CustomerHit[] = [];
  if (q.length >= 2) {
    const or: Prisma.OrderWhereInput[] = [
      { number: { contains: q, mode: 'insensitive' } }, { purchaserName: { contains: q, mode: 'insensitive' } }, { purchaserEmail: { contains: q, mode: 'insensitive' } }, { recipientName: { contains: q, mode: 'insensitive' } },
    ];
    const n = normalizePhone(q);
    const digits = phoneDigits(q);
    if (n.ok) or.push({ purchaserPhoneE164: n.e164 });
    if (digits.length >= 3 && /^[\d\s()+.-]+$/.test(q)) or.push({ purchaserPhoneE164: { contains: digits } });
    and.push({ OR: or });
    customers = (await searchCustomers(q)).filter((c) => c.isDemo === isDemo);
  }

  const rows = await prisma.order.findMany({ where: { AND: and }, orderBy: q ? { createdAt: 'desc' } : [{ deliveryDate: 'asc' }, { createdAt: 'desc' }], take: 200 });

  const today = businessToday(now);
  const cycles = groupByCycle(candidateDates(now, { ...s.schedule, ordersOpen: true, closedDates: [], maxAdvanceWeeks: 6 }).map((d) => d.date), s.schedule);
  // current delivery weekend: the first cycle that still has an upcoming date, plus today if it is a delivery day
  const weekend = cycles.find((g) => g[g.length - 1] >= today) ?? [];
  const open = { isDemo, fulfillmentStatus: { notIn: ['DELIVERED', 'CANCELLED'] as any } };
  const [newCount, unpaid, toPrepare, deliveriesLeft] = await Promise.all([
    prisma.order.count({ where: { isDemo, fulfillmentStatus: 'NEW' } }),
    prisma.order.count({ where: { isDemo, paymentStatus: 'AWAITING_INTERAC', fulfillmentStatus: { not: 'CANCELLED' } } }),
    prisma.order.count({ where: { isDemo, fulfillmentStatus: { in: ['CONFIRMED', 'PREPARING'] } } }),
    prisma.order.count({ where: { ...open, deliveryDate: { in: weekend.length ? weekend : ['-'] } } }),
  ]);

  return {
    counters: { newCount, unpaid, toPrepare, deliveriesLeft }, weekend, ordersOpen: s.schedule.ordersOpen, mode: s.store.mode,
    customers,
    orders: rows.map((o) => ({ id: o.id, number: o.number, customerId: o.customerId, name: o.purchaserName, phone: o.purchaserPhone, phoneE164: o.purchaserPhoneE164, deliveryDate: o.deliveryDate, zoneName: o.zoneName, totalCents: o.totalCents, paymentStatus: o.paymentStatus, fulfillmentStatus: o.fulfillmentStatus, paymentMethod: o.paymentMethod, createdAt: o.createdAt.toISOString(), isDemo: o.isDemo, mismatch: o.contactMismatch })),
    updatedAt: new Date().toISOString(),
  };
}
