'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useFormStatus } from 'react-dom';
import { useRef, useState, type ReactNode } from 'react';
import { Upload, X, Loader2, Check } from 'lucide-react';
import { useI18n } from '@/i18n/client';

export function SubmitButton({ children, className = 'btn-emerald', pendingText }: { children: ReactNode; className?: string; pendingText?: string }) {
  const { pending } = useFormStatus();
  const { t } = useI18n();
  return <button type="submit" className={className} disabled={pending}>{pending ? <><Loader2 size={16} className="animate-spin" aria-hidden /> {pendingText ?? t('a.saving')}</> : children}</button>;
}

/** Confirmation before consequential actions (native <dialog> = accessible, focus-trapped). */
export function ConfirmButton({ children, title, text, confirmLabel, className = 'btn-danger btn-sm', onConfirm, formAction, danger = true }: { children: ReactNode; title: string; text: string; confirmLabel: string; className?: string; onConfirm?: () => void | Promise<void>; formAction?: (fd: FormData) => void | Promise<void>; danger?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const { t } = useI18n();
  return (
    <>
      <button type="button" className={className} onClick={() => ref.current?.showModal()}>{children}</button>
      <dialog ref={ref} className="w-[min(92vw,440px)] rounded-lg border border-gold-line p-0 shadow-xl backdrop:bg-black/50" aria-labelledby="dlg-t">
        <form method="dialog" className="p-6" onSubmit={(e) => e.preventDefault()}>
          <h2 id="dlg-t" className="font-display text-xl font-semibold">{title}</h2>
          <p className="mt-2 text-[15px] text-ink/85">{text}</p>
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" className="btn-outline" onClick={() => ref.current?.close()}>{t('a.cancel')}</button>
            <button type="button" className={danger ? 'btn-danger' : 'btn-emerald'} onClick={async () => { ref.current?.close(); if (formAction) { await formAction(new FormData()); } else await onConfirm?.(); }}>{confirmLabel}</button>
          </div>
        </form>
      </dialog>
    </>
  );
}

export function Tabs({ items }: { items: { href: string; label: string }[] }) {
  const path = usePathname() ?? '';
  return (
    <nav aria-label="Sections" className="-mx-4 mb-6 overflow-x-auto border-b border-gold-line px-4 sm:mx-0 sm:px-0">
      <ul className="flex min-w-max gap-1">
        {items.map((i) => {
          const on = path === i.href || path.startsWith(i.href + '/');
          return <li key={i.href}><Link href={i.href} aria-current={on ? 'page' : undefined} className={`block whitespace-nowrap border-b-[3px] px-4 py-3 text-[15px] font-medium ${on ? 'border-gold text-emerald' : 'border-transparent text-muted hover:text-emerald'}`}>{i.label}</Link></li>;
        })}
      </ul>
    </nav>
  );
}

/** French / English tabs for a pair of fields. Both inputs stay in the DOM so the form always submits both. */
export function BiField({ name, label, defaultFr = '', defaultEn = '', textarea = false, required = false, hint, rows = 3 }: { name: string; label: string; defaultFr?: string; defaultEn?: string; textarea?: boolean; required?: boolean; hint?: string; rows?: number }) {
  const [tab, setTab] = useState<'Fr' | 'En'>('Fr');
  const { t } = useI18n();
  const common = 'input';
  return (
    <div>
      <div className="mb-1 flex items-end justify-between gap-2">
        <label htmlFor={`${name}${tab}`} className="label !mb-0">{label}{required && ' *'}</label>
        <div role="tablist" aria-label={label} className="flex overflow-hidden rounded border border-emerald/30 text-sm">
          {(['Fr', 'En'] as const).map((l) => <button key={l} type="button" role="tab" aria-selected={tab === l} onClick={() => setTab(l)} className={`px-3 py-1 font-medium ${tab === l ? 'bg-emerald text-white' : 'bg-white text-emerald'}`}>{l === 'Fr' ? t('a.french') : t('a.english')}</button>)}
        </div>
      </div>
      {(['Fr', 'En'] as const).map((l) => {
        const props = { id: `${name}${l}`, name: `${name}${l}`, defaultValue: l === 'Fr' ? defaultFr : defaultEn, className: common, hidden: tab !== l, lang: l.toLowerCase() };
        return textarea ? <textarea key={l} rows={rows} {...props} /> : <input key={l} {...props} />;
      })}
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}

export function ImageField({ name, label, defaultValue = '', hint, multiple = false, aspect = '1 / 1', wide = false }: { name: string; label: string; defaultValue?: string; hint?: string; multiple?: boolean; aspect?: string; wide?: boolean }) {
  const { t } = useI18n();
  const [urls, setUrls] = useState<string[]>(defaultValue ? defaultValue.split('\n').filter(Boolean) : []);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true); setErr('');
    const out: string[] = [];
    for (const f of Array.from(files)) {
      const fd = new FormData(); fd.append('file', f);
      const r = await fetch('/api/admin/upload', { method: 'POST', body: fd });
      const j = await r.json().catch(() => ({}));
      if (r.ok) out.push(j.url); else { setErr(t(`a.upload.${j.error ?? 'storage'}`)); break; }
    }
    if (out.length) setUrls(multiple ? [...urls, ...out] : [out[0]]);
    setBusy(false);
    if (ref.current) ref.current.value = '';
  };
  return (
    <div>
      <p className="label">{label}</p>
      <input type="hidden" name={name} value={urls.join('\n')} />
      <div className={`flex flex-wrap gap-3 ${wide ? '' : ''}`}>
        {urls.map((u, i) => (
          <div key={u + i} className={`relative overflow-hidden rounded border border-gold-line bg-champagne ${wide ? 'w-full max-w-[420px]' : 'w-28'}`} style={{ aspectRatio: aspect }}>
            <img src={u} alt="" className="h-full w-full object-cover" />
            {i === 0 && multiple && <span className="absolute left-1 top-1 rounded bg-emerald px-1.5 py-0.5 text-[11px] text-white">{t('a.mainPhoto')}</span>}
            <button type="button" aria-label={t('a.removePhoto')} className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-danger shadow" onClick={() => setUrls(urls.filter((_, k) => k !== i))}><X size={15} aria-hidden /></button>
          </div>
        ))}
        {(multiple || urls.length === 0) && (
          <button type="button" onClick={() => ref.current?.click()} disabled={busy} className={`flex flex-col items-center justify-center gap-1 rounded border-2 border-dashed border-emerald/40 bg-white text-sm text-emerald hover:bg-emerald-soft ${wide ? 'h-32 w-full max-w-[420px]' : 'h-28 w-28'}`}>
            {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Upload size={22} aria-hidden />}{busy ? t('a.uploading') : multiple && urls.length ? t('a.addPhoto') : t('a.choosePhoto')}
          </button>
        )}
        {!multiple && urls.length > 0 && <button type="button" className="btn-outline btn-sm self-end" onClick={() => ref.current?.click()} disabled={busy}>{busy ? t('a.uploading') : t('a.replacePhoto')}</button>}
      </div>
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" multiple={multiple} className="sr-only" tabIndex={-1} onChange={(e) => upload(e.target.files)} aria-label={label} />
      {hint && <p className="hint">{hint}</p>}
      {err && <p className="err" role="alert">{err}</p>}
    </div>
  );
}

export function Toggle({ name, label, defaultChecked = false, hint }: { name: string; label: string; defaultChecked?: boolean; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 py-1">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-1 h-5 w-5 shrink-0 accent-emerald" />
      <span><span className="block font-medium">{label}</span>{hint && <span className="block text-sm text-muted">{hint}</span>}</span>
    </label>
  );
}

export function Flash({ ok, error }: { ok?: string; error?: string }) {
  const { t } = useI18n();
  if (!ok && !error) return null;
  return error
    ? <div role="alert" className="mb-5 rounded border border-red-300 bg-red-50 px-4 py-3 font-medium text-red-900">{t(`a.err.${error}`) === `a.err.${error}` ? error : t(`a.err.${error}`)}</div>
    : <div role="status" className="mb-5 flex items-center gap-2 rounded border border-emerald/30 bg-emerald-soft px-4 py-3 font-medium text-emerald"><Check size={18} aria-hidden /> {t('a.saved')}</div>;
}
