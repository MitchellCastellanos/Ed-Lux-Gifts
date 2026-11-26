'use client';
import { useState } from 'react';
import { useI18n } from '@/i18n/client';
import { SubmitButton } from '@/components/admin/ui';
import { adjustStockAction } from '../../../actions';
import { formatDateTime } from '@/lib/schedule';

export type InvRow = { id: string; name: string; kind: string; image: string | null; onHand: number; reserved: number; low: number; history: { delta: number; newOnHand: number; reason: string; at: string; actor: string }[] };

export function InventoryList({ rows }: { rows: InvRow[] }) {
  const { t, locale } = useI18n();
  const [q, setQ] = useState('');
  const [onlyLow, setOnlyLow] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const shown = rows.filter((r) => r.name.toLowerCase().includes(q.toLowerCase()) && (!onlyLow || r.onHand - r.reserved <= r.low));
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3"><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('a.inv.search')} aria-label={t('a.inv.search')} className="input max-w-md" /><label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-5 w-5 accent-emerald" checked={onlyLow} onChange={(e) => setOnlyLow(e.target.checked)} /> {t('a.inv.onlyLow')}</label></div>
      <ul className="divide-y divide-gold-line/60 rounded-lg border border-gold-line bg-white">
        {shown.map((r) => {
          const av = r.onHand - r.reserved;
          const state = av <= 0 ? 'out' : av <= r.low ? 'low' : 'ok';
          return (
            <li key={r.id} className="p-3">
              <div className="flex flex-wrap items-center gap-3">
                <img src={r.image ?? ''} alt="" className="h-14 w-14 shrink-0 rounded border border-gold-line bg-champagne object-cover" />
                <div className="min-w-[140px] flex-1"><p className="font-medium">{r.name}</p><p className="text-xs text-muted">{t(`a.kind.${r.kind}`)}</p></div>
                <dl className="flex gap-5 text-center text-sm"><div><dt className="text-muted">{t('a.inv.available')}</dt><dd className="text-xl font-semibold text-emerald">{av}</dd></div><div><dt className="text-muted">{t('a.inv.reserved')}</dt><dd className="text-xl font-semibold">{r.reserved}</dd></div><div><dt className="text-muted">{t('a.inv.onHand')}</dt><dd className="text-xl font-semibold">{r.onHand}</dd></div></dl>
                <span className={`badge ${state === 'out' ? 'border-red-300 bg-red-50 text-red-900' : state === 'low' ? 'border-amber-400 bg-amber-50 text-amber-900' : 'border-emerald/40 bg-emerald-soft text-emerald'}`}>{t(`a.inv.${state}`)}</span>
                <button className="btn-outline btn-sm" aria-expanded={open === r.id} onClick={() => setOpen(open === r.id ? null : r.id)}>{t('a.stock.update')}</button>
              </div>
              {open === r.id && (
                <div className="mt-3 rounded bg-champagne/50 p-3">
                  <form action={adjustStockAction} className="flex flex-wrap items-end gap-3">
                    <input type="hidden" name="id" value={r.id} />
                    <div><label className="label" htmlFor={`m${r.id}`}>{t('a.inv.action')}</label><select id={`m${r.id}`} name="mode" className="input !w-auto"><option value="add">{t('a.inv.add')}</option><option value="set">{t('a.inv.set')}</option></select></div>
                    <div><label className="label" htmlFor={`v${r.id}`}>{t('a.inv.quantity')}</label><input id={`v${r.id}`} name="value" type="number" inputMode="numeric" required className="input !w-28" autoFocus /></div>
                    <div className="min-w-[160px] flex-1"><label className="label" htmlFor={`r${r.id}`}>{t('a.inv.reason')}</label><input id={`r${r.id}`} name="reason" className="input" placeholder={t('a.inv.reasonHint')} /></div>
                    <SubmitButton>{t('a.save')}</SubmitButton>
                  </form>
                  <p className="hint">{t('a.inv.help')}</p>
                  {r.history.length > 0 && <details className="mt-2 text-sm"><summary className="cursor-pointer font-medium text-emerald">{t('a.inv.history')}</summary><ul className="mt-1 space-y-0.5">{r.history.map((h, i) => <li key={i}>{formatDateTime(new Date(h.at), locale)} — <b>{h.delta > 0 ? '+' : ''}{h.delta}</b> → {h.newOnHand} {h.reason && `(${h.reason})`}</li>)}</ul></details>}
                </div>
              )}
            </li>
          );
        })}
        {shown.length === 0 && <li className="p-8 text-center text-muted">{t('a.inv.none')}</li>}
      </ul>
    </div>
  );
}
