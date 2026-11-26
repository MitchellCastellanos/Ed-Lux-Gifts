'use client';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Search, Copy, Phone, Check, RefreshCw, Users, PauseCircle, PlayCircle, UserRound } from 'lucide-react';
import { useI18n } from '@/i18n/client';
import { StatusBadge } from '@/components/StatusBadge';
import { formatMoney } from '@/lib/money';
import { formatDate, formatDateTime } from '@/lib/schedule';
import type { WorkspaceData, OrderRow } from '@/lib/admin-orders';
import { setOrdering, setWeekendClosed } from '../../actions';

const FILTERS = ['all', 'new', 'awaiting', 'prepare', 'ready', 'delivered', 'cancelled'] as const;

function primaryAction(o: OrderRow): { action: string; label: string } | null {
  const f = o.fulfillmentStatus, p = o.paymentStatus;
  if (f === 'CANCELLED' && p === 'EXPIRED') return { action: 'reactivate', label: 'a.act.reactivate' };
  if (f === 'DELIVERED' || f === 'CANCELLED') return null;
  if (p === 'AWAITING_INTERAC') return { action: 'markPaid', label: 'a.act.markPaid' };
  if (f === 'NEW') return { action: 'confirm', label: 'a.act.confirm' };
  if (f === 'CONFIRMED') return { action: 'prepare', label: 'a.act.prepare' };
  if (f === 'PREPARING') return { action: 'ready', label: 'a.act.ready' };
  if (f === 'READY') return { action: o.paymentMethod !== 'INTERAC' && p === 'DUE_ON_DELIVERY' ? 'deliverPaid' : 'deliver', label: o.paymentMethod !== 'INTERAC' && p === 'DUE_ON_DELIVERY' ? 'a.act.deliverPaid' : 'a.act.deliver' };
  return null;
}

export function CopyPhone({ value, label }: { value: string; label: string }) {
  const [ok, setOk] = useState(false);
  return <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded border border-emerald/30 bg-white text-emerald hover:bg-emerald-soft" aria-label={label} onClick={async () => { try { await navigator.clipboard.writeText(value); setOk(true); setTimeout(() => setOk(false), 1500); } catch {} }}>{ok ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}</button>;
}

export function OrdersWorkspace({ initial }: { initial: WorkspaceData }) {
  const { t, locale } = useI18n();
  const [data, setData] = useState(initial);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('all');
  const [q, setQ] = useState('');
  const [date, setDate] = useState('');
  const [pay, setPay] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);
  const qs = useRef({ filter, q, date, pay });
  qs.current = { filter, q, date, pay };

  const load = useCallback(async () => {
    setUpdating(true);
    try {
      const u = new URLSearchParams({ filter: qs.current.filter, q: qs.current.q, date: qs.current.date, pay: qs.current.pay });
      const r = await fetch(`/api/admin/orders?${u}`, { cache: 'no-store' });
      if (r.status === 401) { location.href = '/admin/login'; return; }
      if (r.ok) setData(await r.json());
    } catch {}
    setUpdating(false);
  }, []);

  // lightweight polling; paused when the tab is hidden. Only list state is replaced, so typing in the search box is never interrupted.
  useEffect(() => { const id = setInterval(() => { if (document.visibilityState === 'visible') load(); }, 8000); return () => clearInterval(id); }, [load]);
  useEffect(() => { const h = setTimeout(load, 200); return () => clearTimeout(h); }, [filter, q, date, pay, load]);

  const act = async (o: OrderRow, action: string) => {
    setBusyId(o.id); setError('');
    const r = await fetch(`/api/admin/orders/${o.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
    const j = await r.json().catch(() => ({}));
    if (!j.ok) setError(t(`a.err.${j.error}`));
    setBusyId(null);
    load();
  };

  const m = (c: number) => formatMoney(c, locale);
  const c = data.counters;
  const counter = (n: number, label: string, f?: (typeof FILTERS)[number]) => (
    <button type="button" onClick={() => f && setFilter(f)} className="rounded-lg border border-gold-line bg-white px-4 py-3 text-left hover:border-gold">
      <span className="block font-display text-[28px] font-semibold leading-none text-emerald">{n}</span><span className="mt-1 block text-sm text-muted">{label}</span>
    </button>
  );
  const dates = data.weekend;
  const weekendClosed = false;
  void weekendClosed;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-lg border border-gold-line bg-white p-4">
        <div className="flex items-center gap-3">
          <span className={`badge ${data.ordersOpen ? 'border-emerald/40 bg-emerald-soft text-emerald' : 'border-amber-400 bg-amber-50 text-amber-900'}`}>{data.ordersOpen ? <PlayCircle size={14} aria-hidden /> : <PauseCircle size={14} aria-hidden />} {data.ordersOpen ? t('a.orders.open') : t('a.orders.paused')}</span>
          <form action={setOrdering.bind(null, !data.ordersOpen)}><button className="btn-outline btn-sm">{data.ordersOpen ? t('a.orders.pause') : t('a.orders.resume')}</button></form>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[15px]">
          <span className="text-muted">{t('a.orders.weekend')}:</span>
          <strong className="capitalize">{dates.length ? dates.map((d) => formatDate(d, locale, { weekday: 'short', day: 'numeric', month: 'short' })).join(' · ') : '—'}</strong>
          {dates.length > 0 && <form action={setWeekendClosed}><input type="hidden" name="dates" value={dates.join('\n')} /><input type="hidden" name="close" value="true" /><button className="btn-ghost btn-sm text-danger">{t('a.orders.closeWeekend')}</button></form>}
        </div>
        <span className="ml-auto flex items-center gap-1.5 text-xs text-muted" aria-live="polite"><RefreshCw size={13} className={updating ? 'animate-spin' : ''} aria-hidden />{t('a.orders.updated', { time: formatDateTime(new Date(data.updatedAt), locale).split(',').pop()!.trim() })}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {counter(c.newCount, t('a.orders.cNew'), 'new')}{counter(c.unpaid, t('a.orders.cUnpaid'), 'awaiting')}{counter(c.toPrepare, t('a.orders.cPrepare'), 'prepare')}{counter(c.deliveriesLeft, t('a.orders.cDeliveries'))}
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={22} aria-hidden />
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} inputMode="search" autoComplete="off" aria-label={t('a.orders.search')} placeholder={t('a.orders.search')} className="input !min-h-[58px] !pl-12 text-[17px] shadow-sm" />
      </div>

      {q.trim().length >= 2 && (
        <section aria-label={t('a.orders.customerMatches')} className="rounded-lg border-2 border-gold bg-white p-4">
          <h2 className="mb-2 flex items-center gap-2 font-display text-lg font-semibold"><Users size={18} aria-hidden /> {t('a.orders.customerMatches')}</h2>
          {data.customers.length === 0 ? <p className="text-sm text-muted">{t('a.orders.noCustomers')}</p> : (
            <ul className="divide-y divide-gold-line/60">
              {data.customers.map((cu) => (
                <li key={cu.id} className="flex flex-wrap items-center gap-3 py-2.5">
                  <UserRound size={18} className="text-gold-deep" aria-hidden />
                  <div className="min-w-0 flex-1"><p className="font-medium">{cu.name}</p><p className="text-sm text-muted">{cu.phoneDisplay}{cu.email ? ` · ${cu.email}` : ''}</p></div>
                  <span className="text-sm text-muted">{t('a.customer.nOrders', { n: cu.orderCount })}</span>
                  <Link href={`/admin/orders/customers/${cu.id}`} className="btn-emerald btn-sm">{t('a.customer.open')}</Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label={t('a.orders.filters')} className="flex flex-wrap gap-2">
          {FILTERS.map((f) => <button key={f} role="tab" aria-selected={filter === f} onClick={() => setFilter(f)} className={`btn btn-sm ${filter === f ? 'bg-emerald text-white' : 'btn-outline'}`}>{t(`a.filter.${f}`)}</button>)}
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <label className="sr-only" htmlFor="fd">{t('a.orders.byDate')}</label><input id="fd" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input !min-h-[36px] !w-auto !py-1 text-sm" />
          <label className="sr-only" htmlFor="fp">{t('a.orders.byPayment')}</label>
          <select id="fp" value={pay} onChange={(e) => setPay(e.target.value)} className="input !min-h-[36px] !w-auto !py-1 text-sm"><option value="">{t('a.orders.allPayments')}</option><option value="INTERAC">{t('pay.interac')}</option><option value="COD_CASH">{t('pay.codCash')}</option><option value="COD_INTERAC">{t('pay.codInterac')}</option></select>
          {(date || pay) && <button className="btn-ghost btn-sm" onClick={() => { setDate(''); setPay(''); }}>{t('a.orders.clear')}</button>}
        </div>
      </div>
      {error && <p role="alert" className="rounded border border-red-300 bg-red-50 px-3 py-2 text-red-900">{error}</p>}

      {data.orders.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gold-line bg-white p-10 text-center"><p className="font-display text-xl">{t('a.orders.empty')}</p><p className="mt-1 text-muted">{t('a.orders.emptyHelp')}</p></div>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-lg border border-gold-line bg-white md:block">
            <table className="w-full text-left text-[15px]">
              <thead className="bg-champagne/60 text-sm text-ink/80"><tr><th className="px-4 py-3">{t('a.col.order')}</th><th className="px-4 py-3">{t('a.col.customer')}</th><th className="px-4 py-3">{t('a.col.delivery')}</th><th className="px-4 py-3 text-right">{t('a.col.total')}</th><th className="px-4 py-3">{t('a.col.payment')}</th><th className="px-4 py-3">{t('a.col.status')}</th><th className="px-4 py-3" /></tr></thead>
              <tbody className="divide-y divide-gold-line/60">
                {data.orders.map((o) => { const a = primaryAction(o); return (
                  <tr key={o.id} className="hover:bg-ivory/60">
                    <td className="px-4 py-3"><Link href={`/admin/orders/${o.id}`} className="font-semibold text-emerald underline underline-offset-2">{o.number}</Link></td>
                    <td className="px-4 py-3"><span className="block font-medium">{o.name}{o.mismatch && <span title={t('a.order.mismatch')} className="badge ml-2 border-amber-400 bg-amber-50 text-amber-900">!</span>}</span><span className="flex items-center gap-2 text-[15px] font-semibold">{o.phone}<CopyPhone value={o.phoneE164} label={t('a.customer.copyPhone')} /></span></td>
                    <td className="px-4 py-3 capitalize">{formatDate(o.deliveryDate, locale, { weekday: 'short', day: 'numeric', month: 'short' })}<span className="block text-xs normal-case text-muted">{o.zoneName}</span></td>
                    <td className="px-4 py-3 text-right font-medium">{m(o.totalCents)}</td>
                    <td className="px-4 py-3"><StatusBadge kind="p" value={o.paymentStatus} t={t} /></td>
                    <td className="px-4 py-3"><StatusBadge kind="f" value={o.fulfillmentStatus} t={t} /></td>
                    <td className="px-4 py-3 text-right">{a && <button className="btn-emerald btn-sm whitespace-nowrap" disabled={busyId === o.id} onClick={() => act(o, a.action)}>{t(a.label)}</button>}</td>
                  </tr>); })}
              </tbody>
            </table>
          </div>
          <ul className="space-y-3 md:hidden">
            {data.orders.map((o) => { const a = primaryAction(o); return (
              <li key={o.id} className="rounded-lg border border-gold-line bg-white p-4">
                <div className="flex items-start justify-between gap-3"><Link href={`/admin/orders/${o.id}`} className="font-display text-lg font-semibold text-emerald underline underline-offset-2">{o.number}</Link><span className="font-semibold">{m(o.totalCents)}</span></div>
                <p className="mt-1 font-medium">{o.name}</p>
                <p className="mt-0.5 flex items-center gap-2 text-[17px] font-semibold"><a href={`tel:${o.phoneE164}`} className="flex items-center gap-1.5 underline"><Phone size={16} aria-hidden />{o.phone}</a><CopyPhone value={o.phoneE164} label={t('a.customer.copyPhone')} /></p>
                <p className="mt-1 text-sm capitalize text-muted">{formatDate(o.deliveryDate, locale, { weekday: 'long', day: 'numeric', month: 'short' })} · <span className="normal-case">{o.zoneName}</span></p>
                <div className="mt-3 flex flex-wrap items-center gap-2"><StatusBadge kind="p" value={o.paymentStatus} t={t} /><StatusBadge kind="f" value={o.fulfillmentStatus} t={t} /></div>
                {a && <button className="btn-emerald mt-3 w-full" disabled={busyId === o.id} onClick={() => act(o, a.action)}>{t(a.label)}</button>}
              </li>); })}
          </ul>
        </>
      )}
    </div>
  );
}
