import { getT } from '@/i18n/server';
import { prisma } from '@/lib/db';
import { getSettings } from '@/lib/settings';
import { formatDate } from '@/lib/schedule';
import { PageTitle } from '@/components/admin/AdminNav';
import { PrintButton } from '@/components/CopyButton';
import type { ContentLine } from '@/lib/cart';

export default async function PrepPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { t, locale } = await getT();
  const sp = await searchParams;
  const s = await getSettings();
  const isDemo = s.store.mode === 'demo';
  const dates = (await prisma.order.findMany({ where: { isDemo, fulfillmentStatus: { notIn: ['CANCELLED', 'DELIVERED'] } }, select: { deliveryDate: true }, distinct: ['deliveryDate'], orderBy: { deliveryDate: 'asc' } })).map((d) => d.deliveryDate);
  const date = sp.date && dates.includes(sp.date) ? sp.date : dates[0];
  const orders = date ? await prisma.order.findMany({ where: { isDemo, deliveryDate: date, fulfillmentStatus: { notIn: ['CANCELLED'] } }, include: { items: true }, orderBy: { number: 'asc' } }) : [];
  const totals = new Map<string, number>();
  for (const o of orders) for (const it of o.items) for (const c of (it.contents as ContentLine[]) ?? []) { const k = locale === 'fr' ? c.nameFr : c.nameEn; totals.set(k, (totals.get(k) ?? 0) + c.quantity * it.quantity); }
  return (
    <>
      <PageTitle title={t('a.prep.title')} sub={t('a.prep.sub')}><PrintButton /></PageTitle>
      <form className="no-print mb-6 flex flex-wrap items-center gap-3"><label htmlFor="d" className="label !mb-0">{t('checkout.date')}</label>
        <select id="d" name="date" defaultValue={date} className="input !w-auto">{dates.map((d) => <option key={d} value={d}>{formatDate(d, locale)}</option>)}</select><button className="btn-outline">{t('a.show')}</button></form>
      {!date && <p className="rounded-lg border border-dashed border-gold-line bg-white p-8 text-center text-muted">{t('a.prep.empty')}</p>}
      {date && <h2 className="mb-4 font-display text-2xl font-semibold capitalize">{formatDate(date, locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} — {t('a.prep.count', { n: orders.reduce((s, o) => s + o.items.reduce((a, i) => a + i.quantity, 0), 0) })}</h2>}
      <div className="grid gap-4 md:grid-cols-2">
        {orders.map((o) => o.items.map((it) => (
          <article key={it.id} className="break-inside-avoid rounded-lg border border-gold-line bg-white p-4">
            <header className="flex items-baseline justify-between gap-2 border-b border-gold-line pb-2"><h3 className="font-display text-lg font-semibold">{it.quantity > 1 ? `${it.quantity} × ` : ''}{locale === 'fr' ? it.nameFr : it.nameEn}</h3><span className="text-sm font-semibold">{o.number}</span></header>
            <p className="mt-1 text-sm text-muted">{o.recipientName} · {o.purchaserPhone}</p>
            <ul className="mt-2 space-y-0.5 text-[15px]">{((it.contents as ContentLine[]) ?? []).map((c, i) => <li key={i} className="flex gap-2"><span aria-hidden className="mt-1 h-3.5 w-3.5 shrink-0 rounded-sm border border-ink/50" />{c.quantity * it.quantity > 1 ? `${c.quantity * it.quantity} × ` : ''}{locale === 'fr' ? c.nameFr : c.nameEn}{c.paid ? ' (+)' : ''}</li>)}</ul>
            {it.giftMessage && <p className="mt-2 rounded bg-champagne/60 px-2 py-1.5 text-sm"><b>{t('gift.label')}:</b> « {it.giftMessage} »</p>}
          </article>
        )))}
      </div>
      {totals.size > 0 && <section className="mt-8 rounded-lg border border-gold-line bg-white p-5"><h2 className="font-display text-xl font-semibold">{t('a.prep.totals')}</h2><ul className="mt-2 columns-1 gap-8 text-[15px] sm:columns-2">{[...totals.entries()].sort().map(([n, q]) => <li key={n} className="flex justify-between gap-4 border-b border-gold-line/50 py-1"><span>{n}</span><b>{q}</b></li>)}</ul></section>}
    </>
  );
}
