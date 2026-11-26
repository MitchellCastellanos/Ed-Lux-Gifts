import { prisma } from './db';
import { getSettings } from './settings';

/** Deletes expired verification material and (after the configured retention period) old completed orders. */
export async function runMaintenance(now = new Date()) {
  const day = new Date(now.getTime() - 24 * 3600_000);
  const [codes, sessions, limits] = await Promise.all([
    prisma.verificationCode.deleteMany({ where: { createdAt: { lt: day } } }),
    prisma.customerSession.deleteMany({ where: { expiresAt: { lt: now } } }),
    prisma.rateLimit.deleteMany({ where: { windowStart: { lt: day } } }),

  ]);
  await prisma.devEmail.deleteMany({ where: { createdAt: { lt: new Date(now.getTime() - 7 * 86400_000) } } });
  const months = (await getSettings()).retention.orderRetentionMonths;
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - months);
  const orders = await prisma.order.deleteMany({ where: { createdAt: { lt: cutoff }, fulfillmentStatus: { in: ['DELIVERED', 'CANCELLED'] } } });
  const customers = await prisma.customer.deleteMany({ where: { orders: { none: {} }, lastActivityAt: { lt: cutoff }, isDemo: false } });
  return { codes: codes.count, sessions: sessions.count, rateLimits: limits.count, orders: orders.count, customers: customers.count };
}

/** Law 25 style erasure: strips personal data from the customer and from their orders' contact snapshots while keeping the financial record. */
export async function anonymizeCustomer(customerId: string): Promise<{ ok: true } | { ok: false; error: 'active_orders' | 'not_found' }> {
  const c = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!c) return { ok: false, error: 'not_found' };
  const open = await prisma.order.count({ where: { customerId, fulfillmentStatus: { notIn: ['DELIVERED', 'CANCELLED'] } } });
  if (open > 0) return { ok: false, error: 'active_orders' };
  await prisma.$transaction([
    prisma.order.updateMany({ where: { customerId }, data: { purchaserName: 'Client anonymisé', purchaserEmail: 'anonymise@invalid.local', purchaserPhone: '—', purchaserPhoneE164: `anon:${customerId}`, recipientName: 'Anonymisé', recipientPhone: null, address: 'Anonymisé', unit: null, instructions: '', internalNotes: '' } }),
    prisma.customer.update({ where: { id: customerId }, data: { name: 'Client anonymisé', email: null, emailVerifiedAt: null, phoneE164: `anon:${customerId}`, phoneDisplay: '—', notes: '' } }),
    prisma.customerSession.deleteMany({ where: { phoneE164: c.phoneE164 } }),
  ]);
  return { ok: true };
}
