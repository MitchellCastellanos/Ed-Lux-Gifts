'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Trash2, Pencil, ChevronDown, ShoppingBag, AlertTriangle } from 'lucide-react';
import { useI18n } from '@/i18n/client';
import { useCart } from './CartProvider';
import { useQuote } from './useQuote';
import { Img, Notice } from './ui';
import { QtyStepper } from './AddToCart';
import { formatMoney } from '@/lib/money';
import type { PricedItem } from '@/lib/cart';

export function OrderLines({ items, showEdit = false }: { items: PricedItem[]; showEdit?: boolean }) {
  const { t, locale } = useI18n();
  const cart = useCart();
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <ul className="divide-y divide-gold-line/70">
      {items.map((it) => {
        const name = locale === 'fr' ? it.nameFr : it.nameEn;
        return (
          <li key={it.id} className="py-5">
            <div className="flex gap-4">
              <Img src={it.imageUrl} alt="" ratio="1 / 1" className="h-24 w-24 shrink-0 rounded border border-gold-line sm:h-28 sm:w-28" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-display text-lg font-semibold leading-snug">{name}</h3>
                  <p className="shrink-0 font-semibold">{formatMoney(it.lineCents, locale)}</p>
                </div>
                <p className="text-sm text-muted">{formatMoney(it.unitCents, locale)} {it.quantity > 1 ? `× ${it.quantity}` : ''}</p>
                {it.issues.length > 0 && (
                  <p role="alert" className="mt-1 flex items-start gap-1.5 text-sm font-medium text-danger"><AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />{t(`cart.issue.${it.issues[0]}`)}</p>
                )}
                {it.contents.length > 0 && (
                  <button type="button" className="mt-1 flex items-center gap-1 text-sm font-medium text-emerald underline underline-offset-4" aria-expanded={openId === it.id} onClick={() => setOpenId(openId === it.id ? null : it.id)}>
                    {t('cart.contents')} <ChevronDown size={14} aria-hidden className={openId === it.id ? 'rotate-180' : ''} />
                  </button>
                )}
                {openId === it.id && (
                  <ul className="mt-2 space-y-0.5 text-sm text-ink/85">
                    {it.contents.map((c, i) => (<li key={i}>{c.quantity > 1 ? `${c.quantity} × ` : ''}{locale === 'fr' ? c.nameFr : c.nameEn}{c.included ? ` (${t('build.included').toLowerCase()})` : ''}{c.paid ? ` (+${formatMoney(c.priceCents ?? 0, locale)})` : ''}</li>))}
                  </ul>
                )}
                {showEdit && (
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <QtyStepper value={it.quantity} onChange={(n) => cart.setQty(it.id, n)} label={t('cart.quantity')} />
                    {it.kind === 'CUSTOM' && <Link href={`/${locale}/build?edit=${it.id}`} className="btn-ghost btn-sm"><Pencil size={15} aria-hidden /> {t('cart.edit')}</Link>}
                    <button type="button" className="btn-ghost btn-sm text-danger" onClick={() => cart.remove(it.id)}><Trash2 size={15} aria-hidden /> {t('cart.remove')}</button>
                  </div>
                )}
                {showEdit ? (
                  <div className="mt-3">
                    <label htmlFor={`g-${it.id}`} className="text-sm font-medium">{t('gift.label')}</label>
                    <input id={`g-${it.id}`} className="input mt-1" maxLength={400} defaultValue={it.giftMessage} onBlur={(e) => cart.setGift(it.id, e.target.value)} placeholder={t('gift.placeholder')} />
                  </div>
                ) : it.giftMessage ? <p className="mt-2 text-sm italic text-ink/80">« {it.giftMessage} »</p> : null}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function Totals({ q, className = '' }: { q: NonNullable<ReturnType<typeof useQuote>['q']>; className?: string }) {
  const { t, locale } = useI18n();
  const row = (l: string, v: string, strong = false) => <div className={`flex justify-between gap-4 ${strong ? 'border-t border-gold-line pt-3 text-lg font-semibold' : ''}`}><dt>{l}</dt><dd>{v}</dd></div>;
  return (
    <dl className={`space-y-2 text-[15px] ${className}`}>
      {row(t('cart.subtotal'), formatMoney(q.priced.subtotalCents, locale))}
      {row(t('cart.delivery'), q.deliveryFeeCents == null ? t('cart.deliveryTbd') : q.deliveryFeeCents === 0 ? t('cart.free') : formatMoney(q.deliveryFeeCents, locale))}
      {q.taxLines.map((l) => row(l.label, formatMoney(l.cents, locale)))}
      {q.taxMode === 'none' && <p className="text-xs text-muted">{t('cart.noTax')}</p>}
      {q.totalCents != null ? row(t('cart.total'), formatMoney(q.totalCents, locale), true) : row(t('cart.totalBefore'), formatMoney(q.priced.subtotalCents + q.taxCents, locale), true)}
    </dl>
  );
}

export function CartView() {
  const { t, locale } = useI18n();
  const cart = useCart();
  const [postal, setPostal] = useState('');
  useEffect(() => { try { setPostal(localStorage.getItem('edl_postal') ?? ''); } catch {} }, []);
  const { q, loading, error } = useQuote(cart.items, cart.ready, postal);

  const changed = q?.priced.items.filter((i) => i.priceChanged) ?? [];
  const ackChanges = () => {
    if (!q) return;
    cart.replace(cart.items.map((c) => { const p = q.priced.items.find((x) => x.id === c.id); return p && p.priceChanged ? { ...c, seenUnitCents: p.unitCents } : c; }));
  };
  // drop items that no longer exist
  const gone = q?.priced.items.filter((i) => i.issues.includes('unavailable')) ?? [];

  if (cart.ready && cart.items.length === 0)
    return (
      <div className="container-page py-16 text-center">
        <ShoppingBag size={46} strokeWidth={1.2} className="mx-auto text-gold-deep" aria-hidden />
        <h2 className="mt-4 font-display text-2xl font-semibold">{t('cart.empty')}</h2>
        <p className="mt-1 text-muted">{t('cart.emptyHelp')}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3"><Link href={`/${locale}/baskets`} className="btn-emerald">{t('nav.allBaskets')}</Link><Link href={`/${locale}/build`} className="btn-outline">{t('nav.build')}</Link></div>
      </div>
    );

  const blocked = !q || !q.priced.ok;
  return (
    <div className="container-page grid gap-8 py-8 lg:grid-cols-[1fr_380px] lg:py-10">
      <div>
        {changed.length > 0 && (
          <Notice tone="warn" className="mb-4">
            <p className="font-semibold">{t('cart.priceChanged')}</p>
            <ul className="mt-1 list-disc pl-5">{changed.map((i) => <li key={i.id}>{locale === 'fr' ? i.nameFr : i.nameEn}: {formatMoney(i.unitCents, locale)}</li>)}</ul>
            <button type="button" className="btn-outline btn-sm mt-2" onClick={ackChanges}>{t('cart.ack')}</button>
          </Notice>
        )}
        {gone.length > 0 && <Notice tone="error" className="mb-4"><p>{t('cart.gone')}</p><button type="button" className="btn-outline btn-sm mt-2" onClick={() => cart.replace(cart.items.filter((c) => !gone.some((g) => g.id === c.id)))}>{t('cart.removeGone')}</button></Notice>}
        {error && <Notice tone="error" className="mb-4">{t('cart.quoteError')}</Notice>}
        {q ? <OrderLines items={q.priced.items} showEdit /> : <p className="py-10 text-center text-muted">{t('common.loading')}</p>}
      </div>
      <aside className="card h-fit p-5 lg:sticky lg:top-28" aria-label={t('cart.summary')}>
        <h2 className="font-display text-xl font-semibold">{t('cart.summary')}</h2>
        <div className="mt-4">
          <label htmlFor="pc" className="label">{t('cart.postalLabel')}</label>
          <input id="pc" className="input uppercase" autoComplete="postal-code" placeholder="H9R 1A1" maxLength={9} value={postal} onChange={(e) => { setPostal(e.target.value); try { localStorage.setItem('edl_postal', e.target.value); } catch {} }} />
          {q?.postal === 'invalid' && <p className="err">{t('v.postal')}</p>}
          {q?.postal === 'unsupported' && <p className="err">{t('cart.zoneUnsupported')}</p>}
          {q?.postal === 'ok' && q.zone && <p className="hint">{q.zone.name}</p>}
        </div>
        <div className="mt-5" aria-busy={loading}>{q && <Totals q={q} />}</div>
        <Link href={`/${locale}/checkout`} aria-disabled={blocked} className={`btn-gold mt-5 w-full ${blocked ? 'pointer-events-none opacity-50' : ''}`}>{t('cart.checkout')}</Link>
        <Link href={`/${locale}/baskets`} className="btn-ghost mt-2 w-full">{t('cart.continue')}</Link>
      </aside>
    </div>
  );
}
