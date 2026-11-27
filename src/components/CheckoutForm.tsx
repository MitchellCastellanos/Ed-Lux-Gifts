'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AsYouType, parsePhoneNumberFromString } from 'libphonenumber-js';
import { useI18n } from '@/i18n/client';
import { useCart } from './CartProvider';
import { useQuote } from './useQuote';
import { Notice } from './ui';
import { OrderLines, Totals } from './CartView';
import { formatMoney } from '@/lib/money';

export type DateChoice = { date: string; label: string; group: string };
export type PayChoice = { method: 'INTERAC' | 'COD_CASH'; label: string; help: string };

type F = Record<string, string>;
const initial: F = { phone: '', name: '', email: '', address: '', unit: '', city: '', postal: '', recName: '', recPhone: '', date: '', instructions: '' };

export function CheckoutForm({ dates, pay, closedMessage, demo }: { dates: DateChoice[]; pay: PayChoice[]; closedMessage: string | null; demo: boolean }) {
  const { t, locale } = useI18n();
  const cart = useCart();
  const router = useRouter();
  const [f, setF] = useState<F>(initial);
  const [method, setMethod] = useState<string>(pay.length === 1 ? pay[0].method : '');
  const [diff, setDiff] = useState(false);
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<{ tone: 'error' | 'warn'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [idem, setIdem] = useState('');
  const { q, loading } = useQuote(cart.items, cart.ready, f.postal);

  useEffect(() => {
    try {
      let k = sessionStorage.getItem('edl_idem');
      if (!k) { k = crypto.randomUUID() + crypto.randomUUID().slice(0, 8); sessionStorage.setItem('edl_idem', k); }
      setIdem(k);
      const saved = JSON.parse(localStorage.getItem('edl_checkout') ?? '{}');
      setF((p) => ({ ...p, ...saved, postal: saved.postal || localStorage.getItem('edl_postal') || '', date: '' }));
    } catch {}
  }, []);
  useEffect(() => { try { const { date: _d, instructions: _i, ...keep } = f; localStorage.setItem('edl_checkout', JSON.stringify(keep)); } catch {} }, [f]);
  useEffect(() => { if (f.date && !dates.some((d) => d.date === f.date)) setF((p) => ({ ...p, date: '' })); }, [dates, f.date]);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((p) => ({ ...p, [k]: e.target.value }));
  const fmtPhone = (k: string) => () => setF((p) => { const v = p[k]; if (!v) return p; const pn = parsePhoneNumberFromString(v, 'CA'); return pn?.isValid() ? { ...p, [k]: pn.country === 'CA' || pn.country === 'US' ? pn.formatNational() : pn.formatInternational() } : p; });
  const err = (k: string) => (errors[k] ? <p className="err" id={`e-${k}`}>{t(`v.${errors[k]}`)}</p> : null);
  const bad = (k: string) => (errors[k] ? { 'aria-invalid': true as const, 'aria-describedby': `e-${k}` } : {});

  if (cart.ready && cart.items.length === 0 && !busy)
    return <div className="container-page py-16 text-center"><p className="font-display text-2xl">{t('cart.empty')}</p><Link href={`/${locale}/baskets`} className="btn-emerald mt-5">{t('nav.allBaskets')}</Link></div>;
  if (closedMessage) return <div className="container-page py-12"><Notice tone="warn">{closedMessage}</Notice></div>;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBanner(null);
    const local: Record<string, string> = {};
    if (!f.phone.trim()) local['purchaser.phone'] = 'required';
    else if (!parsePhoneNumberFromString(f.phone, 'CA')?.isValid()) local['purchaser.phone'] = 'phone';
    if (f.name.trim().length < 2) local['purchaser.name'] = 'required';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim())) local['purchaser.email'] = 'email';
    if (f.address.trim().length < 3) local['delivery.address'] = 'required';
    if (!f.city.trim()) local['delivery.city'] = 'required';
    if (!f.postal.trim()) local['delivery.postalCode'] = 'required';
    if (diff && f.recPhone && !parsePhoneNumberFromString(f.recPhone, 'CA')?.isValid()) local['delivery.recipientPhone'] = 'phone';
    if (!f.date) local['delivery.deliveryDate'] = 'required';
    if (!method) local.paymentMethod = 'required';
    if (!terms) local.acceptTerms = 'terms';
    setErrors(local);
    if (Object.keys(local).length) { setBanner({ tone: 'error', text: t('checkout.fixErrors') }); document.getElementById('checkout-top')?.scrollIntoView({ behavior: 'smooth' }); return; }

    setBusy(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cart: cart.items, expectedTotalCents: q?.totalCents ?? undefined, idempotencyKey: idem,
          purchaser: { phone: f.phone, name: f.name, email: f.email, locale },
          delivery: { address: f.address, unit: f.unit, city: f.city, postalCode: f.postal, recipientName: diff ? f.recName : '', recipientPhone: diff ? f.recPhone : '', deliveryDate: f.date, instructions: f.instructions },
          paymentMethod: method, acceptTerms: terms,
        }),
      });
      const j = await res.json();
      if (j.ok) {
        try { sessionStorage.removeItem('edl_idem'); } catch {}
        cart.clear();
        router.push(`/${locale}/order/${j.token}?placed=1`);
        return;
      }
      if (j.error === 'validation') { setErrors(j.fields ?? {}); setBanner({ tone: 'error', text: t('checkout.fixErrors') }); }
      else if (j.error === 'changed') {
        if (j.priced) cart.replace(cart.items.map((c: any) => { const p = j.priced.items.find((x: any) => x.id === c.id); return p ? { ...c, seenUnitCents: p.unitCents } : c; }));
        setBanner({ tone: 'warn', text: t('checkout.changed') });
      } else setBanner({ tone: 'error', text: t(`checkout.err.${j.error}`) });
      document.getElementById('checkout-top')?.scrollIntoView({ behavior: 'smooth' });
    } catch { setBanner({ tone: 'error', text: t('checkout.err.network') }); }
    setBusy(false);
  };

  const groups = [...new Set(dates.map((d) => d.group))];
  const interac = pay.filter((p) => p.method === 'INTERAC');
  const cod = pay.filter((p) => p.method !== 'INTERAC');

  return (
    <form onSubmit={submit} noValidate className="container-page grid gap-8 py-8 lg:grid-cols-[1fr_400px] lg:py-10">
      <div className="space-y-8">
        <div id="checkout-top" />
        {banner && <Notice tone={banner.tone}>{banner.text}</Notice>}
        {demo && <Notice tone="info">{t('demo.checkoutNote')}</Notice>}

        <fieldset className="card space-y-4 p-5 sm:p-6">
          <legend className="float-left mb-4 w-full font-display text-xl font-semibold">1. {t('checkout.you')}</legend>
          <div className="clear-both">
            <label htmlFor="phone" className="label text-base">{t('checkout.phone')} *</label>
            <input id="phone" name="tel" type="tel" inputMode="tel" autoComplete="tel" className="input !min-h-[52px] text-lg" value={f.phone} onChange={(e) => setF((p) => ({ ...p, phone: new AsYouType('CA').input(e.target.value) }))} onBlur={fmtPhone('phone')} placeholder="(514) 555-0123" {...bad('purchaser.phone')} />
            <p className="hint">{t('checkout.phoneHelp')}</p>
            {err('purchaser.phone')}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label htmlFor="name" className="label">{t('checkout.name')} *</label><input id="name" name="name" autoComplete="name" className="input" value={f.name} onChange={set('name')} {...bad('purchaser.name')} />{err('purchaser.name')}</div>
            <div><label htmlFor="email" className="label">{t('checkout.email')} *</label><input id="email" name="email" type="email" inputMode="email" autoComplete="email" className="input" value={f.email} onChange={set('email')} {...bad('purchaser.email')} />{err('purchaser.email')}</div>
          </div>
        </fieldset>

        <fieldset className="card space-y-4 p-5 sm:p-6">
          <legend className="float-left mb-4 w-full font-display text-xl font-semibold">2. {t('checkout.delivery')}</legend>
          <div className="clear-both grid gap-4 sm:grid-cols-[1fr_140px]">
            <div><label htmlFor="addr" className="label">{t('checkout.address')} *</label><input id="addr" autoComplete="address-line1" className="input" value={f.address} onChange={set('address')} {...bad('delivery.address')} />{err('delivery.address')}</div>
            <div><label htmlFor="unit" className="label">{t('checkout.unit')}</label><input id="unit" autoComplete="address-line2" className="input" value={f.unit} onChange={set('unit')} /></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label htmlFor="city" className="label">{t('checkout.city')} *</label><input id="city" autoComplete="address-level2" className="input" value={f.city} onChange={set('city')} {...bad('delivery.city')} />{err('delivery.city')}</div>
            <div><label htmlFor="postal" className="label">{t('checkout.postal')} *</label><input id="postal" autoComplete="postal-code" className="input uppercase" value={f.postal} onChange={set('postal')} placeholder="H9R 1A1" maxLength={9} {...bad('delivery.postalCode')} />{err('delivery.postalCode')}
              {q?.postal === 'ok' && q.zone && <p className="hint text-emerald">✓ {q.zone.name} — {formatMoney(q.deliveryFeeCents ?? 0, locale)}</p>}
              {q?.postal === 'unsupported' && <p className="err">{t('cart.zoneUnsupported')}</p>}
            </div>
          </div>
          <label className="flex items-center gap-2 text-[15px]"><input type="checkbox" className="h-5 w-5 accent-emerald" checked={diff} onChange={(e) => setDiff(e.target.checked)} /> {t('checkout.differentRecipient')}</label>
          {diff && (
            <div className="grid gap-4 rounded border border-gold-line bg-champagne/40 p-4 sm:grid-cols-2">
              <div><label htmlFor="rn" className="label">{t('checkout.recName')}</label><input id="rn" className="input" value={f.recName} onChange={set('recName')} /></div>
              <div><label htmlFor="rp" className="label">{t('checkout.recPhone')}</label><input id="rp" type="tel" inputMode="tel" className="input" value={f.recPhone} onChange={(e) => setF((p) => ({ ...p, recPhone: new AsYouType('CA').input(e.target.value) }))} onBlur={fmtPhone('recPhone')} {...bad('delivery.recipientPhone')} /><p className="hint">{t('checkout.recPhoneHelp')}</p>{err('delivery.recipientPhone')}</div>
            </div>
          )}
          <div>
            <p className="label" id="dl">{t('checkout.date')} *</p>
            {dates.length === 0 ? <Notice tone="warn">{t('checkout.noDates')}</Notice> : (
              <div role="radiogroup" aria-labelledby="dl" className="space-y-3">
                {groups.map((g) => (
                  <div key={g}><p className="mb-1.5 text-sm font-medium text-muted">{g}</p>
                    <div className="grid gap-2 sm:grid-cols-2">{dates.filter((d) => d.group === g).map((d) => (
                      <label key={d.date} className={`flex min-h-[48px] cursor-pointer items-center gap-3 rounded border px-3 py-2 ${f.date === d.date ? 'border-emerald bg-emerald-soft' : 'border-emerald/25 bg-white'}`}>
                        <input type="radio" name="date" className="h-5 w-5 accent-emerald" checked={f.date === d.date} onChange={() => setF((p) => ({ ...p, date: d.date }))} /> <span className="capitalize">{d.label}</span>
                      </label>))}</div></div>
                ))}
              </div>
            )}
            <p className="hint">{t('checkout.dateHelp')}</p>{err('delivery.deliveryDate')}
          </div>
          <div><label htmlFor="ins" className="label">{t('checkout.instructions')} <span className="font-normal text-muted">({t('common.optional')})</span></label><textarea id="ins" rows={2} maxLength={400} className="input" value={f.instructions} onChange={set('instructions')} /></div>
        </fieldset>

        <fieldset className="card space-y-3 p-5 sm:p-6">
          <legend className="float-left mb-4 w-full font-display text-xl font-semibold">3. {t('checkout.payment')}</legend>
          <div className="clear-both space-y-3">
            {pay.length === 0 && <Notice tone="error">{t('checkout.noPayment')}</Notice>}
            {[['INTERAC', interac] as const, ['COD', cod] as const].map(([k, list]) => list.length > 0 && (
              <div key={k} className="space-y-2">
                {pay.length > 1 && <p className="text-sm font-semibold text-emerald">{k === 'INTERAC' ? t('checkout.payNow') : t('checkout.payLater')}</p>}
                {list.map((p) => (
                  <label key={p.method} className={`flex cursor-pointer items-start gap-3 rounded border p-3 ${method === p.method ? 'border-emerald bg-emerald-soft' : 'border-emerald/25 bg-white'}`}>
                    <input type="radio" name="pay" className="mt-1 h-5 w-5 accent-emerald" checked={method === p.method} onChange={() => setMethod(p.method)} />
                    <span><span className="block font-medium">{p.label}</span><span className="block text-sm text-muted">{p.help}</span></span>
                  </label>
                ))}
              </div>
            ))}
            {err('paymentMethod')}
          </div>
        </fieldset>

        <div>
          <label className="flex items-start gap-3 text-[15px]"><input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-emerald" checked={terms} onChange={(e) => setTerms(e.target.checked)} {...bad('acceptTerms')} />
            <span>{t('checkout.terms1')} <Link href={`/${locale}/terms`} target="_blank" className="font-medium text-emerald underline">{t('footer.terms')}</Link> {t('checkout.terms2')} <Link href={`/${locale}/privacy`} target="_blank" className="font-medium text-emerald underline">{t('footer.privacy')}</Link>.</span></label>
          {err('acceptTerms')}
        </div>
      </div>

      <aside className="card h-fit space-y-4 p-5 lg:sticky lg:top-28" aria-label={t('cart.summary')}>
        <h2 className="font-display text-xl font-semibold">{t('cart.summary')}</h2>
        {q && <div className="max-h-[320px] overflow-y-auto pr-1"><OrderLines items={q.priced.items} /></div>}
        <div aria-busy={loading}>{q && <Totals q={q} />}</div>
        {q && q.totalCents == null && <p className="text-sm text-muted">{t('checkout.feeHint')}</p>}
        {method === 'INTERAC' && <p className="rounded bg-champagne/70 p-3 text-sm">{t('checkout.interacNote')}</p>}
        {method.startsWith('COD') && <p className="rounded bg-champagne/70 p-3 text-sm">{t('checkout.codNote')}</p>}
        <button type="submit" className="btn-gold w-full !min-h-[52px] text-[17px]" disabled={busy || loading || !q || !q.priced.ok}>{busy ? t('checkout.placing') : t('checkout.place')}</button>
        {q && !q.priced.ok && <p className="err">{t('cart.fixItems')} <Link className="underline" href={`/${locale}/cart`}>{t('nav.cart')}</Link></p>}
      </aside>
    </form>
  );
}
