'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Minus, Plus, Check } from 'lucide-react';
import { useCart, newId } from './CartProvider';
import { useI18n } from '@/i18n/client';

export function QtyStepper({ value, onChange, min = 1, max = 20, label }: { value: number; onChange: (n: number) => void; min?: number; max?: number; label: string }) {
  return (
    <div className="inline-flex items-center rounded border border-emerald/30 bg-white" role="group" aria-label={label}>
      <button type="button" className="flex h-11 w-11 items-center justify-center disabled:opacity-40" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label="−"><Minus size={16} aria-hidden /></button>
      <span className="w-9 select-none text-center font-semibold" aria-live="polite">{value}</span>
      <button type="button" className="flex h-11 w-11 items-center justify-center disabled:opacity-40" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="+"><Plus size={16} aria-hidden /></button>
    </div>
  );
}

export function AddToCart({ productId, stock, priceCents }: { productId: string; stock: number; priceCents: number }) {
  const { t, locale } = useI18n();
  const cart = useCart();
  const [qty, setQty] = useState(1);
  const [msg, setMsg] = useState('');
  const [added, setAdded] = useState(false);
  if (stock <= 0) return <p role="status" className="rounded border border-red-300 bg-red-50 px-4 py-3 text-red-900">{t('product.unavailableMsg')}</p>;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium">{t('cart.quantity')}</span>
        <QtyStepper value={qty} onChange={setQty} max={Math.min(20, stock)} label={t('cart.quantity')} />
        {stock <= 3 && <span className="text-sm text-amber-800">{t('product.fewLeft', { n: stock })}</span>}
      </div>
      <div>
        <label htmlFor="gm" className="label">{t('gift.label')} <span className="font-normal text-muted">({t('common.optional')})</span></label>
        <textarea id="gm" rows={3} maxLength={400} value={msg} onChange={(e) => setMsg(e.target.value)} className="input" placeholder={t('gift.placeholder')} />
      </div>
      <button type="button" className="btn-emerald w-full sm:w-auto sm:min-w-[260px]" onClick={() => { cart.add({ id: newId(), kind: 'READY', productId, quantity: qty, giftMessage: msg, seenUnitCents: priceCents }); setAdded(true); setQty(1); }}>
        {t('product.addToCart')}
      </button>
      {added && (
        <p role="status" className="flex flex-wrap items-center gap-3 rounded border border-emerald/30 bg-emerald-soft px-4 py-3 text-emerald">
          <Check size={18} aria-hidden /> {t('product.added')} <Link href={`/${locale}/cart`} className="font-semibold underline">{t('product.viewCart')}</Link>
        </p>
      )}
    </div>
  );
}
