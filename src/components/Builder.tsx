'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Minus, Plus, ArrowLeft, ArrowRight } from 'lucide-react';
import { useI18n } from '@/i18n/client';
import { useCart, newId } from './CartProvider';
import { Img } from './ui';
import { formatMoney } from '@/lib/money';
import { priceCustomBasket } from '@/lib/pricing';
import { QtyStepper } from './AddToCart';

export type BBase = { id: string; name: string; image: string | null; priceCents: number; capacity: number; available: number; includedOptionIds: string[] };
export type BItem = { id: string; name: string; image: string | null; priceCents: number; cost: number; available: number; categoryId: string };
export type BCat = { id: string; name: string };
export type BOpt = { id: string; name: string; desc: string; image: string | null; priceCents: number; available: number };

type State = { baseId: string | null; qty: Record<string, number>; optionIds: string[]; message: string; baskets: number; step: number };
const KEY = 'edl_builder_v1';

export function Builder({ bases, items, categories, options }: { bases: BBase[]; items: BItem[]; categories: BCat[]; options: BOpt[] }) {
  const { t, locale } = useI18n();
  const cart = useCart();
  const router = useRouter();
  const [st, setSt] = useState<State>({ baseId: null, qty: {}, optionIds: [], message: '', baskets: 1, step: 1 });
  const [cat, setCat] = useState(categories[0]?.id ?? '');
  const [loaded, setLoaded] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // restore progress (or load a cart item being edited)
  useEffect(() => {
    try {
      const edit = new URLSearchParams(location.search).get('edit');
      if (edit && cart.ready) {
        const it = cart.items.find((i) => i.id === edit);
        if (it && it.kind === 'CUSTOM') {
          setEditId(edit);
          setSt({ baseId: it.baseId, qty: Object.fromEntries(it.lines.map((l) => [l.componentId, l.quantity])), optionIds: it.optionIds, message: it.giftMessage ?? '', baskets: it.quantity, step: 4 });
          setLoaded(true);
          return;
        }
      }
      if (!edit) { const raw = sessionStorage.getItem(KEY); if (raw) setSt(JSON.parse(raw)); }
    } catch {}
    if (cart.ready) setLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart.ready]);
  useEffect(() => { if (loaded && !editId) try { sessionStorage.setItem(KEY, JSON.stringify(st)); } catch {} }, [st, loaded, editId]);

  const base = bases.find((b) => b.id === st.baseId) ?? null;
  const itemMap = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const optMap = useMemo(() => new Map(options.map((o) => [o.id, o])), [options]);

  const lines = Object.entries(st.qty).filter(([, q]) => q > 0).map(([componentId, quantity]) => ({ componentId, quantity }));
  const priced = base
    ? priceCustomBasket({ id: base.id, priceCents: base.priceCents, capacity: base.capacity, includedOptionIds: base.includedOptionIds }, new Map(items.map((i) => [i.id, { id: i.id, priceCents: i.priceCents, capacityCost: i.cost }])), new Map(options.map((o) => [o.id, { id: o.id, priceCents: o.priceCents }])), { baseId: base.id, lines, optionIds: st.optionIds })
    : null;
  const used = lines.reduce((s, l) => s + (itemMap.get(l.componentId)?.cost ?? 0) * l.quantity, 0);
  const remaining = base ? base.capacity - used : 0;
  const total = priced && priced.ok ? priced.unitCents : base?.priceCents ?? 0;
  const set = (p: Partial<State>) => setSt((s) => ({ ...s, ...p }));

  const changeQty = (id: string, d: number) => {
    const it = itemMap.get(id)!;
    const cur = st.qty[id] ?? 0;
    const next = cur + d;
    if (next < 0 || next > it.available) return;
    if (d > 0 && it.cost > remaining) return;
    set({ qty: { ...st.qty, [id]: next } });
  };

  const steps = [t('build.step1'), t('build.step2'), t('build.step3'), t('build.step4')];
  const canNext = st.step === 1 ? !!base : st.step === 2 ? lines.length > 0 : true;

  const finish = () => {
    if (!base || !priced || !priced.ok) return;
    const item = { id: editId ?? newId(), kind: 'CUSTOM' as const, baseId: base.id, lines, optionIds: st.optionIds, quantity: st.baskets, giftMessage: st.message, seenUnitCents: priced.unitCents };
    if (editId) cart.replace(cart.items.map((i) => (i.id === editId ? item : i)));
    else cart.add(item);
    try { sessionStorage.removeItem(KEY); } catch {}
    router.push(`/${locale}/cart`);
  };

  const shownItems = items.filter((i) => i.categoryId === cat);
  const included = new Set(base?.includedOptionIds ?? []);

  return (
    <div className="container-page py-8 sm:py-10">
      <ol className="mb-8 grid grid-cols-4 gap-2" aria-label={t('build.progress')}>
        {steps.map((s, i) => {
          const n = i + 1;
          const done = st.step > n;
          const cur = st.step === n;
          return (
            <li key={s}>
              <button type="button" disabled={n > st.step && !(base && (n <= 2 || lines.length))} onClick={() => set({ step: n })} aria-current={cur ? 'step' : undefined}
                className={`w-full border-t-4 pt-2 text-left text-sm ${cur ? 'border-gold text-emerald font-semibold' : done ? 'border-emerald text-emerald' : 'border-gold-line text-muted'}`}>
                <span className="flex items-center gap-1.5"><span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${done ? 'bg-emerald text-white' : cur ? 'bg-gold text-emerald-dark' : 'bg-champagne'}`}>{done ? <Check size={13} aria-hidden /> : n}</span><span className="hidden sm:inline">{s}</span></span>
              </button>
            </li>
          );
        })}
      </ol>

      {st.step === 1 && (
        <section aria-labelledby="s1">
          <h2 id="s1" className="font-display text-2xl font-semibold sm:text-3xl">{t('build.chooseBase')}</h2>
          <p className="mt-1 text-muted">{t('build.chooseBaseHelp')}</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {bases.map((b) => {
              const off = b.available <= 0;
              const sel = b.id === st.baseId;
              return (
                <button key={b.id} type="button" disabled={off} aria-pressed={sel}
                  onClick={() => { const keep = used <= b.capacity; set({ baseId: b.id, qty: keep ? st.qty : {}, optionIds: st.optionIds.filter((o) => !b.includedOptionIds.includes(o)) }); }}
                  className={`overflow-hidden rounded-lg border-2 bg-white text-left transition ${sel ? 'border-gold shadow-md' : 'border-gold-line hover:border-gold'} ${off ? 'opacity-50' : ''}`}>
                  <Img src={b.image} alt={b.name} ratio="1 / 1" />
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2"><h3 className="font-display text-xl font-semibold">{b.name}</h3>{sel && <Check className="text-gold-deep" aria-label={t('build.selected')} />}</div>
                    <p className="text-lg font-semibold text-emerald">{formatMoney(b.priceCents, locale)}</p>
                    <p className="text-sm text-muted">{off ? t('product.soldOut') : t('build.capacityHint', { n: b.capacity })}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {st.step === 2 && base && (
        <section aria-labelledby="s2">
          <h2 id="s2" className="font-display text-2xl font-semibold sm:text-3xl">{t('build.chooseItems')}</h2>
          <p className="mt-1 text-muted">{t('build.chooseItemsHelp')}</p>
          <div className="sticky top-[68px] z-30 -mx-4 mt-4 border-y border-gold-line bg-ivory/95 px-4 py-3 backdrop-blur-sm sm:mx-0 sm:rounded sm:border lg:top-[80px]">
            <div className="flex items-center justify-between gap-4 text-sm">
              <div className="flex-1"><div className="mb-1 flex justify-between"><span className="font-medium">{t('build.space')}</span><span aria-live="polite">{t('build.spaceLeft', { n: Math.max(0, remaining) })}</span></div>
                <div className="h-2.5 overflow-hidden rounded-full bg-champagne" role="progressbar" aria-valuemin={0} aria-valuemax={base.capacity} aria-valuenow={used} aria-label={t('build.space')}><div className={`h-full ${remaining <= 0 ? 'bg-burgundy' : 'bg-gold'}`} style={{ width: `${Math.min(100, (used / base.capacity) * 100)}%` }} /></div></div>
              <div className="text-right"><div className="text-muted">{t('build.runningTotal')}</div><div className="text-xl font-semibold text-emerald" aria-live="polite">{formatMoney(total, locale)}</div></div>
            </div>
          </div>
          <div className="mt-5 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label={t('build.categories')}>
            {categories.map((c) => {
              const n = items.filter((i) => i.categoryId === c.id).reduce((s, i) => s + (st.qty[i.id] ?? 0), 0);
              return <button key={c.id} role="tab" aria-selected={cat === c.id} onClick={() => setCat(c.id)} className={`btn btn-sm shrink-0 ${cat === c.id ? 'bg-emerald text-white' : 'btn-outline'}`}>{c.name}{n > 0 && <span className="ml-1 rounded-full bg-gold px-1.5 text-xs text-emerald-dark">{n}</span>}</button>;
            })}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {shownItems.map((i) => {
              const q = st.qty[i.id] ?? 0;
              const noSpace = i.cost > remaining;
              return (
                <div key={i.id} className={`flex flex-col overflow-hidden rounded-lg border bg-white ${q > 0 ? 'border-gold' : 'border-gold-line'}`}>
                  <Img src={i.image} alt={i.name} ratio="1 / 1" />
                  <div className="flex flex-1 flex-col p-3">
                    <h3 className="text-[15px] font-semibold leading-snug">{i.name}</h3>
                    <p className="text-emerald">{formatMoney(i.priceCents, locale)}</p>
                    {i.available <= 0 ? <p className="mt-2 text-sm text-danger">{t('product.soldOut')}</p> : (
                      <div className="mt-auto pt-3">
                        <div className="inline-flex items-center rounded border border-emerald/30" role="group" aria-label={i.name}>
                          <button type="button" className="flex h-11 w-11 items-center justify-center disabled:opacity-30" onClick={() => changeQty(i.id, -1)} disabled={q === 0} aria-label={`${t('build.remove')} ${i.name}`}><Minus size={16} aria-hidden /></button>
                          <span className="w-8 text-center font-semibold" aria-live="polite">{q}</span>
                          <button type="button" className="flex h-11 w-11 items-center justify-center disabled:opacity-30" onClick={() => changeQty(i.id, 1)} disabled={noSpace || q >= i.available} aria-label={`${t('build.add')} ${i.name}`}><Plus size={16} aria-hidden /></button>
                        </div>
                        {noSpace && q === 0 && <p className="mt-1 text-xs text-muted">{t('build.noSpace')}</p>}
                        {q >= i.available && q > 0 && <p className="mt-1 text-xs text-amber-800">{t('build.maxStock')}</p>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {shownItems.length === 0 && <p className="mt-6 text-muted">{t('build.emptyCategory')}</p>}
        </section>
      )}

      {st.step === 3 && base && (
        <section aria-labelledby="s3">
          <h2 id="s3" className="font-display text-2xl font-semibold sm:text-3xl">{t('build.finishing')}</h2>
          <p className="mt-1 text-muted">{t('build.finishingHelp')}</p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {options.filter((o) => included.has(o.id) || o.available > 0).map((o) => {
              const inc = included.has(o.id);
              const on = inc || st.optionIds.includes(o.id);
              return (
                <li key={o.id}>
                  <label className={`flex cursor-pointer items-center gap-4 rounded-lg border bg-white p-3 ${on ? 'border-gold' : 'border-gold-line'} ${inc ? 'cursor-default' : ''}`}>
                    <input type="checkbox" className="h-5 w-5 accent-emerald" checked={on} disabled={inc} onChange={(e) => set({ optionIds: e.target.checked ? [...st.optionIds, o.id] : st.optionIds.filter((x) => x !== o.id) })} />
                    <Img src={o.image} alt="" ratio="1 / 1" className="h-16 w-16 shrink-0 rounded" />
                    <span className="flex-1"><span className="block font-semibold">{o.name}</span><span className="block text-sm text-muted">{o.desc}</span></span>
                    <span className={`badge shrink-0 ${inc ? 'border-emerald/40 bg-emerald-soft text-emerald' : 'border-gold-line bg-champagne text-ink'}`}>{inc ? t('build.included') : `+ ${formatMoney(o.priceCents, locale)}`}</span>
                  </label>
                </li>
              );
            })}
          </ul>
          <div className="mt-6 max-w-xl">
            <label htmlFor="bm" className="label">{t('gift.label')} <span className="font-normal text-muted">({t('common.optional')})</span></label>
            <textarea id="bm" rows={3} maxLength={400} className="input" value={st.message} onChange={(e) => set({ message: e.target.value })} placeholder={t('gift.placeholder')} />
          </div>
        </section>
      )}

      {st.step === 4 && base && (
        <section aria-labelledby="s4" className="grid gap-8 lg:grid-cols-[1fr_380px]">
          <div>
            <h2 id="s4" className="font-display text-2xl font-semibold sm:text-3xl">{t('build.review')}</h2>
            <div className="card mt-5 divide-y divide-gold-line/70">
              <div className="flex items-center gap-4 p-4"><Img src={base.image} alt="" ratio="1 / 1" className="h-20 w-20 shrink-0 rounded" /><div className="flex-1"><p className="font-semibold">{base.name}</p><p className="text-sm text-muted">{t('build.basket')}</p></div><p className="font-medium">{formatMoney(base.priceCents, locale)}</p></div>
              {lines.map((l) => { const it = itemMap.get(l.componentId)!; return <div key={l.componentId} className="flex items-center justify-between gap-3 px-4 py-3"><span>{l.quantity} × {it.name}</span><span>{formatMoney(it.priceCents * l.quantity, locale)}</span></div>; })}
              {[...new Set([...base.includedOptionIds, ...st.optionIds])].map((id) => { const o = optMap.get(id); if (!o) return null; const inc = included.has(id); return <div key={id} className="flex items-center justify-between gap-3 px-4 py-3"><span>{o.name} {inc && <span className="badge ml-1 border-emerald/40 bg-emerald-soft text-emerald">{t('build.included')}</span>}</span><span>{inc ? '—' : formatMoney(o.priceCents, locale)}</span></div>; })}
              {st.message && <div className="px-4 py-3 text-sm"><span className="font-medium">{t('gift.label')}:</span> <span className="italic">« {st.message} »</span></div>}
            </div>
            <p className="mt-3 text-sm text-muted">{t('build.priceNote')}</p>
          </div>
          <aside className="card h-fit space-y-4 p-5 lg:sticky lg:top-28">
            <div className="flex items-baseline justify-between"><span className="text-muted">{t('build.priceEach')}</span><span className="text-2xl font-semibold text-emerald">{formatMoney(total, locale)}</span></div>
            <div className="flex items-center justify-between"><span className="text-sm font-medium">{t('build.howMany')}</span><QtyStepper value={st.baskets} onChange={(n) => set({ baskets: n })} max={Math.min(10, base.available)} label={t('build.howMany')} /></div>
            <button type="button" className="btn-gold w-full" disabled={!priced || !priced.ok} onClick={finish}>{editId ? t('build.saveChanges') : t('build.addToCart')}</button>
          </aside>
        </section>
      )}

      <div className="mt-8 flex items-center justify-between border-t border-gold-line pt-5">
        <button type="button" className="btn-ghost" onClick={() => set({ step: Math.max(1, st.step - 1) })} disabled={st.step === 1}><ArrowLeft size={17} aria-hidden /> {t('build.back')}</button>
        {st.step < 4 && (
          <div className="flex items-center gap-3">
            {st.step === 2 && lines.length === 0 && <span className="hidden text-sm text-muted sm:inline">{t('build.needOne')}</span>}
            <button type="button" className="btn-emerald" disabled={!canNext} onClick={() => set({ step: st.step + 1 })}>{st.step === 3 ? t('build.reviewBtn') : t('build.next')} <ArrowRight size={17} aria-hidden /></button>
          </div>
        )}
      </div>
    </div>
  );
}
