import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Phone, Mail, AlertTriangle, History } from 'lucide-react';
import { getT } from '@/i18n/server';
import { prisma } from '@/lib/db';
import { allowedActions } from '@/lib/orders';
import { formatMoney } from '@/lib/money';
import { formatDate, formatDateTime } from '@/lib/schedule';
import { PageTitle } from '@/components/admin/AdminNav';
import { StatusBadge } from '@/components/StatusBadge';
import { Flash, SubmitButton } from '@/components/admin/ui';
import { CopyPhone } from '../OrdersWorkspace';
import { OrderActions } from './OrderActions';
import { saveOrderNotes, moveOrderAction } from '../../../actions';
import type { ContentLine } from '@/lib/cart';

export default async function AdminOrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { t, locale } = await getT();
  const o = await prisma.order.findUnique({ where: { id }, include: { items: true, events: { orderBy: { createdAt: 'asc' } }, customer: { include: { _count: { select: { orders: true } } } } } });
  if (!o) notFound();
  const m = (c: number) => formatMoney(c, locale);
  const actions = allowedActions(o);
  const taxLines = (o.taxLines as { label: string; cents: number }[]) ?? [];
  const card = 'rounded-lg border border-gold-line bg-white p-5';
  return (
    <>
      <p className="mb-2 text-sm"><Link href="/admin/orders" className="text-emerald underline">← {t('a.nav.orders')}</Link></p>
      <PageTitle title={o.number} sub={t('order.placedOn', { date: formatDateTime(o.createdAt, locale) })}>
        <StatusBadge kind="p" value={o.paymentStatus} t={t} /><StatusBadge kind="f" value={o.fulfillmentStatus} t={t} />
      </PageTitle>
      <Flash ok={sp.ok} error={sp.error} />
      {o.isDemo && <p className="mb-4 rounded bg-burgundy px-3 py-2 text-sm text-white">{t('demo.orderBanner')}</p>}
      {o.contactMismatch && <p className="mb-4 flex items-start gap-2 rounded border border-amber-400 bg-amber-50 px-3 py-2 text-amber-950"><AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden /> {t('a.order.mismatchLong')}</p>}
      {o.paymentStatus === 'AWAITING_INTERAC' && o.reservationExpiresAt && <p className="mb-4 rounded bg-champagne/70 px-3 py-2 text-sm">{t('a.order.interacHelp', { amount: formatMoney(o.totalCents, locale), number: o.number, date: formatDateTime(o.reservationExpiresAt, locale) })}</p>}
      <div className={`${card} mb-6`}><OrderActions id={o.id} actions={actions} /></div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className={card}>
            <h2 className="font-display text-xl font-semibold">{t('order.items')}</h2>
            <ul className="mt-3 divide-y divide-gold-line/60">
              {o.items.map((it) => (
                <li key={it.id} className="py-3 first:pt-0">
                  <div className="flex justify-between gap-3"><p className="font-semibold">{locale === 'fr' ? it.nameFr : it.nameEn}{it.quantity > 1 ? ` × ${it.quantity}` : ''}</p><p>{m(it.unitCents * it.quantity)}</p></div>
                  <ul className="mt-1 text-sm text-ink/80">{((it.contents as ContentLine[]) ?? []).map((c, i) => <li key={i}>{c.quantity > 1 ? `${c.quantity} × ` : ''}{locale === 'fr' ? c.nameFr : c.nameEn}{c.paid ? ` (+${m(c.priceCents ?? 0)})` : ''}</li>)}</ul>
                  {it.giftMessage && <p className="mt-2 rounded bg-champagne/60 px-3 py-2 text-sm"><b>{t('gift.label')}:</b> « {it.giftMessage} »</p>}
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-1 border-t border-gold-line pt-3 text-[15px]">
              <div className="flex justify-between"><dt>{t('cart.subtotal')}</dt><dd>{m(o.subtotalCents)}</dd></div>
              <div className="flex justify-between"><dt>{t('cart.delivery')} ({o.zoneName})</dt><dd>{m(o.deliveryFeeCents)}</dd></div>
              {taxLines.map((l) => <div key={l.label} className="flex justify-between"><dt>{l.label}</dt><dd>{m(l.cents)}</dd></div>)}
              <div className="flex justify-between border-t border-gold-line pt-2 text-lg font-semibold"><dt>{t('cart.total')}</dt><dd>{m(o.totalCents)}</dd></div>
            </dl>
          </section>

          <section className={card}>
            <h2 className="font-display text-xl font-semibold">{t('order.deliveryInfo')}</h2>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2 text-[15px]">
              <div><dt className="text-sm text-muted">{t('order.deliveryDate')}</dt><dd className="font-semibold capitalize">{formatDate(o.deliveryDate, locale, { weekday: 'long', day: 'numeric', month: 'long' })}</dd></div>
              <div><dt className="text-sm text-muted">{t('order.recipient')}</dt><dd className="font-medium">{o.recipientName}</dd></div>
              <div className="sm:col-span-2"><dt className="text-sm text-muted">{t('order.address')}</dt><dd>{o.unit ? `${o.unit}-` : ''}{o.address}, {o.city} {o.postalCode}</dd></div>
              {o.recipientPhone && <div><dt className="text-sm text-muted">{t('checkout.recPhone')}</dt><dd><a className="underline" href={`tel:${o.recipientPhone}`}>{o.recipientPhone}</a></dd></div>}
              {o.instructions && <div className="sm:col-span-2"><dt className="text-sm text-muted">{t('checkout.instructions')}</dt><dd>{o.instructions}</dd></div>}
              <div><dt className="text-sm text-muted">{t('order.payMethod')}</dt><dd>{o.paymentMethod === 'INTERAC' ? t('pay.interac') : o.paymentMethod === 'COD_CASH' ? t('pay.codCash') : t('pay.codInterac')}</dd></div>
            </dl>
          </section>

          <section className={card}>
            <h2 className="font-display text-xl font-semibold">{t('a.order.notes')}</h2>
            <p className="text-sm text-muted">{t('a.order.notesHelp')}</p>
            <form action={saveOrderNotes} className="mt-3 space-y-3"><input type="hidden" name="id" value={o.id} /><textarea name="notes" rows={3} defaultValue={o.internalNotes} className="input" /><SubmitButton>{t('a.save')}</SubmitButton></form>
          </section>
        </div>

        <div className="space-y-6">
          <section className={card}>
            <h2 className="font-display text-xl font-semibold">{t('a.order.customer')}</h2>
            <p className="mt-2 text-lg font-semibold">{o.purchaserName}</p>
            <p className="mt-1 flex items-center gap-2 text-[19px] font-semibold"><a href={`tel:${o.purchaserPhoneE164}`} className="flex items-center gap-2 underline"><Phone size={18} aria-hidden />{o.purchaserPhone}</a><CopyPhone value={o.purchaserPhoneE164} label={t('a.customer.copyPhone')} /></p>
            <p className="mt-1 flex items-center gap-2 text-sm"><Mail size={15} aria-hidden /> {o.purchaserEmail}</p>
            <Link href={`/admin/orders/customers/${o.customerId}`} className="btn-outline mt-4 w-full"><History size={16} aria-hidden /> {t('a.order.history', { n: o.customer._count.orders })}</Link>
            <details className="mt-4 text-sm"><summary className="cursor-pointer font-medium text-emerald">{t('a.order.moveTitle')}</summary>
              <form action={moveOrderAction} className="mt-2 space-y-2"><input type="hidden" name="id" value={o.id} /><p className="text-muted">{t('a.order.moveHelp')}</p><input name="phone" type="tel" inputMode="tel" className="input" placeholder="(514) 555-0123" required /><SubmitButton className="btn-outline btn-sm">{t('a.order.moveBtn')}</SubmitButton></form></details>
          </section>
          <section className={card}>
            <h2 className="font-display text-xl font-semibold">{t('a.order.historyTitle')}</h2>
            <ol className="mt-3 space-y-3 border-l-2 border-gold-line pl-4">
              {o.events.map((e) => (
                <li key={e.id} className="text-sm"><p className="font-medium">{e.type === 'created' ? t('a.ev.created') : e.type === 'fulfillment' ? `${t('a.ev.fulfillment')}: ${t(`status.f.${e.toValue}`)}` : e.type === 'payment' ? `${t('a.ev.payment')}: ${t(`status.p.${e.toValue}`)}` : e.type === 'expired' ? t('a.ev.expired') : e.type === 'reassigned' ? t('a.ev.reassigned') : e.type}</p><p className="text-muted">{formatDateTime(e.createdAt, locale)} · {e.actor}</p></li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </>
  );
}
