import { getT } from '@/i18n/server';
import { prisma } from '@/lib/db';
import { getSettings } from '@/lib/settings';
import { formatDate } from '@/lib/schedule';
import { formatMoney } from '@/lib/money';
import { PageTitle } from '@/components/admin/AdminNav';
import { PrintButton } from '@/components/CopyButton';
import { StatusBadge } from '@/components/StatusBadge';
import Link from 'next/link';

export default async function DeliveriesPage() {
  const { t, locale } = await getT();
  const s = await getSettings();
  const orders = await prisma.order.findMany({ where: { isDemo: s.store.mode === 'demo', fulfillmentStatus: { notIn: ['CANCELLED', 'DELIVERED'] } }, orderBy: [{ deliveryDate: 'asc' }, { zoneName: 'asc' }, { postalCode: 'asc' }] });
  const byDay = new Map<string, Map<string, typeof orders>>();
  for (const o of orders) { const z = byDay.get(o.deliveryDate) ?? new Map(); z.set(o.zoneName, [...(z.get(o.zoneName) ?? []), o]); byDay.set(o.deliveryDate, z); }
  return (
    <>
      <PageTitle title={t('a.deliveries.title')} sub={t('a.deliveries.sub')}><PrintButton /></PageTitle>
      {orders.length === 0 && <p className="rounded-lg border border-dashed border-gold-line bg-white p-8 text-center text-muted">{t('a.deliveries.empty')}</p>}
      {[...byDay.entries()].map(([d, zones]) => (
        <section key={d} className="mb-8">
          <h2 className="mb-3 font-display text-2xl font-semibold capitalize">{formatDate(d, locale, { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
          {[...zones.entries()].map(([z, list]) => (
            <div key={z} className="mb-4"><h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-gold-deep">{z}</h3>
              <ul className="space-y-2">{list.map((o) => (
                <li key={o.id} className="break-inside-avoid rounded-lg border border-gold-line bg-white p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2"><p className="text-lg font-semibold">{o.recipientName}</p><Link href={`/admin/orders/${o.id}`} className="text-sm font-semibold text-emerald underline">{o.number}</Link></div>
                  <p>{o.unit ? `${o.unit}-` : ''}{o.address}, {o.city} {o.postalCode}</p>
                  <p className="text-[15px]">{t('a.deliveries.phone')}: <a className="font-semibold underline" href={`tel:${o.recipientPhone ?? o.purchaserPhoneE164}`}>{o.recipientPhone ?? o.purchaserPhone}</a>{o.recipientPhone ? ` (${t('a.deliveries.buyer')}: ${o.purchaserPhone})` : ''}</p>
                  {o.instructions && <p className="mt-1 rounded bg-champagne/60 px-2 py-1 text-sm">{o.instructions}</p>}
                  <div className="mt-2 flex flex-wrap items-center gap-2"><StatusBadge kind="f" value={o.fulfillmentStatus} t={t} />{o.paymentStatus !== 'PAID' && <span className="badge border-sky-300 bg-sky-50 text-sky-900">{t('a.deliveries.collect', { amount: formatMoney(o.totalCents, locale) })}</span>}</div>
                </li>))}</ul></div>
          ))}
        </section>
      ))}
    </>
  );
}
