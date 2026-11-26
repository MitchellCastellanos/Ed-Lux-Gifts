'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AsYouType } from 'libphonenumber-js';
import { useI18n } from '@/i18n/client';
import { Notice } from './ui';

/** Two-step passwordless flow: request a code by email, then verify it. Used for order recovery and full history. */
export function CodeFlow({ mode, supportPhone, supportEmail }: { mode: 'order' | 'history'; supportPhone: string; supportEmail: string }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [step, setStep] = useState<'form' | 'code'>('form');
  const [phone, setPhone] = useState('');
  const [second, setSecond] = useState(''); // order number or email
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'error' | 'info' | 'warn'; text: string } | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const url = mode === 'order' ? '/api/track' : '/api/my-orders';
  const body = (extra: object) => JSON.stringify(mode === 'order' ? { orderNumber: second, phone, locale, ...extra } : { email: second, phone, locale, ...extra });

  const request = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setBusy(true); setMsg(null);
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body({ action: 'request' }) });
      const j = await r.json();
      if (j.ok) { setStep('code'); setDevCode(j.devCode ?? null); setMsg({ tone: 'info', text: t('verify.sent') }); }
      else if (j.reason === 'rate') setMsg({ tone: 'warn', text: t('verify.rate') });
      else setMsg({ tone: 'warn', text: t('verify.unavailable') });
    } catch { setMsg({ tone: 'error', text: t('checkout.err.network') }); }
    setBusy(false);
  };
  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body({ action: 'verify', code }) });
      const j = await r.json();
      if (j.ok) { router.push(mode === 'order' ? `/${locale}/order/${j.token}` : `/${locale}/my-orders`); router.refresh(); return; }
      setMsg({ tone: 'error', text: t('verify.failed') });
    } catch { setMsg({ tone: 'error', text: t('checkout.err.network') }); }
    setBusy(false);
  };

  return (
    <div className="card p-5 sm:p-7">
      <h2 className="font-display text-2xl font-semibold">{mode === 'order' ? t('track.formTitle') : t('orders.formTitle')}</h2>
      <p className="mt-1 text-muted">{mode === 'order' ? t('track.formHelp') : t('orders.formHelp')}</p>
      {msg && <Notice tone={msg.tone} className="mt-4">{msg.text}{msg.tone === 'warn' && <span className="mt-1 block text-sm">{t('verify.contact')} <a className="underline" href={`tel:${supportPhone.replace(/[^\d+]/g, '')}`}>{supportPhone}</a> · <a className="underline" href={`mailto:${supportEmail}`}>{supportEmail}</a></span>}</Notice>}
      {step === 'form' ? (
        <form onSubmit={request} className="mt-5 space-y-4">
          <div><label htmlFor="cf-phone" className="label text-base">{t('checkout.phone')}</label><input id="cf-phone" type="tel" inputMode="tel" autoComplete="tel" className="input !min-h-[52px] text-lg" required value={phone} onChange={(e) => setPhone(new AsYouType('CA').input(e.target.value))} placeholder="(514) 555-0123" /></div>
          {mode === 'order'
            ? <div><label htmlFor="cf-num" className="label">{t('track.orderNumber')}</label><input id="cf-num" className="input uppercase" required autoCapitalize="characters" autoComplete="off" value={second} onChange={(e) => setSecond(e.target.value)} placeholder="EDL-001047" /></div>
            : <div><label htmlFor="cf-mail" className="label">{t('checkout.email')}</label><input id="cf-mail" type="email" inputMode="email" autoComplete="email" className="input" required value={second} onChange={(e) => setSecond(e.target.value)} /></div>}
          <button className="btn-emerald w-full sm:w-auto" disabled={busy}>{busy ? t('common.loading') : t('verify.sendCode')}</button>
          <p className="text-sm text-muted">{mode === 'order' ? t('track.privacy') : t('orders.privacy')}</p>
        </form>
      ) : (
        <form onSubmit={verify} className="mt-5 space-y-4">
          <div><label htmlFor="cf-code" className="label text-base">{t('verify.codeLabel')}</label>
            <input id="cf-code" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required className="input !min-h-[56px] text-center text-2xl tracking-[0.5em]" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} /></div>
          {devCode && <p className="rounded border border-dashed border-burgundy p-2 text-sm text-burgundy" data-testid="dev-code">{t('verify.devOnly')} <b>{devCode}</b></p>}
          <div className="flex flex-wrap gap-3"><button className="btn-emerald" disabled={busy || code.length !== 6}>{busy ? t('common.loading') : t('verify.confirm')}</button>
            <button type="button" className="btn-ghost" onClick={() => request()} disabled={busy}>{t('verify.resend')}</button>
            <button type="button" className="btn-ghost" onClick={() => { setStep('form'); setMsg(null); setCode(''); }}>{t('verify.change')}</button></div>
        </form>
      )}
    </div>
  );
}
