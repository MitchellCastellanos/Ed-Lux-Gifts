import Link from 'next/link';
import { Check, Clock, XCircle, Phone, Mail } from 'lucide-react';
import type { Order, OrderItem } from '@prisma/client';
import { makeT } from '@/i18n';
import { formatMoney, type Locale } from '@/lib/money';
import { formatDate, formatDateTime } from '@/lib/schedule';
import type { SettingsMap } from '@/lib/settings';
import { CopyButton, PrintButton } from './CopyButton';
import { StatusBadge } from './StatusBadge';
import { Img } from './ui';
import type { ContentLine } from '@/lib/cart';

const STEPS = ['NEW', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERED'] as const;

export function Timeline({ order, t }: { order: Pick<Order, 'fulfillmentStatus' | 'paymentStatus' | 'cancelReason'>; t: ReturnType<typeof makeT> }) {
  const cancelled = order.fulfillmentStatus === 'CANCELLED';
  const expired = order.paymentStatus === 'EXPIRED';
  const idx = cancelled ? 0 : STEPS.indexOf(order.fulfillmentStatus as any);
  return (
    <ol className="space-y-0" aria-label={t('order.progress')}>
      {STEPS.map((s, i) => {
        if (cancelled && i > 0) return null;
        const done = i < idx || (order.fulfillmentStatus === 'DELIVERED' && i === idx);
        const cur = i === idx && !done && !cancelled;
        return (
          <li key={s} className="relative flex gap-4 pb-6 last:pb-0" aria-current={cur ? 'step' : undefined}>
            {(i < STEPS.length - 1 && !(cancelled)) && <span aria-hidden className={`absolute left-[15px] top-8 h-[calc(100%-2rem)] w-0.5 ${i < idx ? 'bg-emerald' : 'bg-gold-line'}`} />}
            {cancelled && <span aria-hidden className="absolute left-[15px] top-8 h-[calc(100%-2rem)] w-0.5 bg-gold-line" />}
            <span className={`z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${done || (cancelled && i === 0) ? 'border-emerald bg-emerald text-white' : cur ? 'border-gold bg-gold text-emerald-dark' : 'border-gold-line bg-white text-muted'}`}>
              {done || (cancelled && i === 0) ? <Check size={16} aria-hidden /> : cur ? <Clock size={15} aria-hidden /> : i + 1}
            </span>
            <span className="pt-1"><span className={`block font-medium ${cur ? 'text-emerald' : done || (cancelled && i === 0) ? 'text-ink' : 'text-muted'}`}>{t(`timeline.${s}`)}</span>{cur && <span className="block text-sm text-muted">{t('timeline.current')}</span>}</span>
          </li>
        );
      })}
      {cancelled && (
        <li className="relative flex gap-4">
          <span className="z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-danger bg-danger text-white"><XCircle size={16} aria-hidden /></span>
          <span className="pt-1"><span className="block font-medium text-danger">{expired ? t('timeline.EXPIRED') : t('timeline.CANCELLED')}</span><span className="block text-sm text-muted">{expired ? t('timeline.expiredHelp') : t('timeline.cancelledHelp')}</span></span>
        </li>
      )}
    </ol>
  );
}

export function OrderDetail({ order, settings, locale, placed = false, backHref }: { order: Order & { items: OrderItem[] }; settings: SettingsMap; locale: Locale; placed?: boolean; backHref?: string }) {
  const t = makeT(locale);
  const m = (c: number) => formatMoney(c, locale);
  const o = order;
  const interacDue = o.paymentMethod === 'INTERAC' && o.paymentStatus === 'AWAITING_INTERAC';
  const codDue = o.paymentMethod !== 'INTERAC' && o.paymentStatus === 'DUE_ON_DELIVERY' && o.fulfillmentStatus !== 'CANCELLED';
  const taxLines = (o.taxLines as { label: string; cents: number }[]) ?? [];
  const phone = settings.business.phone;
  const instr = locale === 'fr' ? settings.payments.interacInstructionsFr : settings.payments.interacInstructionsEn;
  return (
    <div className="container-page max-w-4xl py-8 sm:py-10">
      {placed && (
        <div className="mb-8 rounded-lg border border-gold bg-white p-6 text-center sm:p-8">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald text-white"><Check aria-hidden /></span>
          <h1 className="mt-4 font-display text-[30px] font-semibold sm:text-[38px]">{t('order.thanks')}</h1>
          <p className="mt-1 text-muted">{t('order.thanksSub')}</p>
          <p className="mt-5 text-sm uppercase tracking-widest text-muted">{t('order.number')}</p>
          <p className="font-display text-[34px] font-semibold tracking-wide text-emerald" data-testid="order-number">{o.number}</p>
          <p className="mx-auto mt-4 max-w-xl text-sm text-muted">{t('order.saveHint')}</p>
        </div>
      )}
      {!placed && (
        <div className="mb-6">
          {backHref && <Link href={backHref} className="text-sm font-medium text-emerald underline underline-offset-4">← {t('orders.backToList')}</Link>}
          <h1 className="mt-2 font-display text-[30px] font-semibold sm:text-[38px]">{t('order.number')} <span data-testid="order-number">{o.number}</span></h1>
          <p className="text-muted">{t('order.placedOn', { date: formatDateTime(o.createdAt, locale) })}</p>
        </div>
      )}
      {o.isDemo && <p className="mb-4 rounded bg-burgundy px-3 py-2 text-sm text-white">{t('demo.orderBanner')}</p>}

      <div className="flex flex-wrap gap-2"><StatusBadge kind="p" value={o.paymentStatus} t={t} /><StatusBadge kind="f" value={o.fulfillmentStatus} t={t} /></div>

      {interacDue && (
        <section className="mt-6 rounded-lg border-2 border-gold bg-white p-5 sm:p-6" aria-labelledby="pay-h">
          <h2 id="pay-h" className="font-display text-xl font-semibold">{t('order.interacTitle')}</h2>
          <p className="mt-1 rounded bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">{t('order.notVerified')}</p>
          <dl className="mt-4 space-y-3">
            {[[t('order.amount'), m(o.totalCents), (o.totalCents / 100).toFixed(2)], [t('order.sendTo'), settings.payments.interacEmail, settings.payments.interacEmail], [t('order.reference'), o.number, o.number]].map(([l, v, c]) => (
              <div key={l} className="flex flex-wrap items-center justify-between gap-2 border-b border-gold-line/60 pb-3 last:border-0"><dt className="text-sm text-muted">{l}</dt><dd className="flex items-center gap-3"><span className="break-all text-lg font-semibold">{v}</span><CopyButton value={c} label={l} /></dd></div>
            ))}
          </dl>
          <p className="mt-3 text-sm">{instr}</p>
          {o.reservationExpiresAt && <p className="mt-2 text-sm font-medium">{t('order.deadline', { date: formatDateTime(o.reservationExpiresAt, locale) })}</p>}
        </section>
      )}
      {codDue && (
        <section className="mt-6 rounded-lg border-2 border-gold bg-white p-5 sm:p-6">
          <h2 className="font-display text-xl font-semibold">{t('order.codTitle')}</h2>
          <p className="mt-1">{t('order.codText', { amount: m(o.totalCents), method: o.paymentMethod === 'COD_CASH' ? t('pay.codCash').toLowerCase() : t('pay.codInterac').toLowerCase() })}</p>
        </section>
      )}
      {o.paymentStatus === 'PAID' && <p className="mt-5 rounded bg-emerald-soft px-4 py-3 text-emerald">{t('order.paidMsg')}</p>}
      {o.paymentStatus === 'EXPIRED' && <p className="mt-5 rounded bg-red-50 px-4 py-3 text-red-900">{t('order.expiredMsg', { phone })}</p>}

      <div className="mt-8 grid gap-6 md:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <section className="card p-5" aria-labelledby="items-h">
            <h2 id="items-h" className="font-display text-xl font-semibold">{t('order.items')}</h2>
            <ul className="mt-3 divide-y divide-gold-line/60">
              {o.items.map((it) => {
                const contents = (it.contents as ContentLine[]) ?? [];
                return (
                  <li key={it.id} className="flex gap-4 py-4 first:pt-0">
                    <Img src={it.imageUrl} alt="" ratio="1 / 1" className="h-20 w-20 shrink-0 rounded border border-gold-line" />
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between gap-3"><p className="font-semibold">{locale === 'fr' ? it.nameFr : it.nameEn}{it.quantity > 1 ? ` × ${it.quantity}` : ''}</p><p className="shrink-0 font-medium">{m(it.unitCents * it.quantity)}</p></div>
                      {contents.length > 0 && <ul className="mt-1 text-sm text-ink/80">{contents.map((c, i) => <li key={i}>{c.quantity > 1 ? `${c.quantity} × ` : ''}{locale === 'fr' ? c.nameFr : c.nameEn}{c.included ? ` (${t('build.included').toLowerCase()})` : ''}</li>)}</ul>}
                      {it.giftMessage && <p className="mt-2 text-sm italic">{t('gift.label')}: « {it.giftMessage} »</p>}
                    </div>
                  </li>
                );
              })}
            </ul>
            <dl className="mt-4 space-y-1.5 border-t border-gold-line pt-4 text-[15px]">
              <div className="flex justify-between"><dt>{t('cart.subtotal')}</dt><dd>{m(o.subtotalCents)}</dd></div>
              <div className="flex justify-between"><dt>{t('cart.delivery')}</dt><dd>{o.deliveryFeeCents === 0 ? t('cart.free') : m(o.deliveryFeeCents)}</dd></div>
              {taxLines.map((l) => <div key={l.label} className="flex justify-between"><dt>{l.label}</dt><dd>{m(l.cents)}</dd></div>)}
              <div className="flex justify-between border-t border-gold-line pt-2 text-lg font-semibold"><dt>{t('cart.total')}</dt><dd>{m(o.totalCents)}</dd></div>
            </dl>
          </section>
          <section className="card p-5">
            <h2 className="font-display text-xl font-semibold">{t('order.deliveryInfo')}</h2>
            <dl className="mt-3 space-y-2 text-[15px]">
              <div><dt className="text-sm text-muted">{t('order.deliveryDate')}</dt><dd className="font-semibold capitalize">{formatDate(o.deliveryDate, locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</dd></div>
              <div><dt className="text-sm text-muted">{t('order.recipient')}</dt><dd>{o.recipientName}</dd></div>
              <div><dt className="text-sm text-muted">{t('order.address')}</dt><dd>{o.unit ? `${o.unit}-` : ''}{o.address}, {o.city} {o.postalCode}</dd></div>
              {o.instructions && <div><dt className="text-sm text-muted">{t('checkout.instructions')}</dt><dd>{o.instructions}</dd></div>}
              <div><dt className="text-sm text-muted">{t('order.payMethod')}</dt><dd>{o.paymentMethod === 'INTERAC' ? t('pay.interac') : o.paymentMethod === 'COD_CASH' ? t('pay.codCash') : t('pay.codInterac')}</dd></div>
            </dl>
          </section>
        </div>
        <div className="space-y-6">
          <section className="card p-5"><h2 className="mb-4 font-display text-xl font-semibold">{t('order.progress')}</h2><Timeline order={o} t={t} /></section>
          <section className="card space-y-2 p-5 no-print">
            <h2 className="font-display text-lg font-semibold">{t('order.help')}</h2>
            <a href={`tel:${phone.replace(/[^\d+]/g, '')}`} className="flex items-center gap-2 text-emerald underline"><Phone size={16} aria-hidden /> {phone}</a>
            <a href={`mailto:${settings.business.email}?subject=${encodeURIComponent(o.number)}`} className="flex items-center gap-2 text-emerald underline"><Mail size={16} aria-hidden /> {t('order.contactSupport')}</a>
          </section>
        </div>
      </div>

      <div className="no-print mt-8 flex flex-wrap gap-3">
        {placed && <Link href={`/${locale}/order/${o.publicToken}`} className="btn-emerald">{t('order.trackBtn')}</Link>}
        <Link href={`/${locale}/my-orders`} className={placed ? 'btn-outline' : 'btn-emerald'}>{t('order.viewMyOrders')}</Link>
        <PrintButton />
      </div>
      {placed && <p className="no-print mt-4 text-sm text-muted">{t('order.retrieveHint')}</p>}
    </div>
  );
}
