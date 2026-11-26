'use client';
import { useMemo, useState } from 'react';
import { Minus, Plus, Trash2, Search } from 'lucide-react';
import { useI18n } from '@/i18n/client';
import { formatMoney } from '@/lib/money';

export type RComp = { id: string; name: string; kind: string; image: string | null; priceCents: number; available: number };

/** Visual recipe editor: pick components from a searchable list, set quantities. No IDs typed by hand. */
export function RecipeEditor({ components, initial, priceCents }: { components: RComp[]; initial: { componentId: string; quantity: number }[]; priceCents: number }) {
  const { t, locale } = useI18n();
  const [lines, setLines] = useState(initial);
  const [q, setQ] = useState('');
  const map = useMemo(() => new Map(components.map((c) => [c.id, c])), [components]);
  const retail = lines.reduce((s, l) => s + (map.get(l.componentId)?.priceCents ?? 0) * l.quantity, 0);
  const can = lines.length ? Math.min(...lines.map((l) => Math.floor((map.get(l.componentId)?.available ?? 0) / l.quantity))) : 0;
  const set = (id: string, d: number) => setLines((ls) => ls.flatMap((l) => (l.componentId === id ? (l.quantity + d < 1 ? [] : [{ ...l, quantity: Math.min(99, l.quantity + d) }]) : [l])));
  const shown = components.filter((c) => !lines.some((l) => l.componentId === c.id) && c.name.toLowerCase().includes(q.toLowerCase())).slice(0, 8);
  return (
    <div className="space-y-4">
      <input type="hidden" name="recipe" value={JSON.stringify(lines)} />
      <div>
        <p className="label">{t('a.recipe.contents')}</p>
        {lines.length === 0 ? <p className="rounded border border-dashed border-gold-line bg-white p-4 text-sm text-muted">{t('a.recipe.empty')}</p> : (
          <ul className="divide-y divide-gold-line/60 rounded border border-gold-line bg-white">
            {lines.map((l) => { const c = map.get(l.componentId); if (!c) return null; return (
              <li key={l.componentId} className="flex items-center gap-3 p-2.5">
                <img src={c.image ?? ''} alt="" className="h-12 w-12 shrink-0 rounded border border-gold-line bg-champagne object-cover" />
                <div className="min-w-0 flex-1"><p className="truncate font-medium">{c.name}</p><p className="text-xs text-muted">{c.kind === 'BASE' ? `${t('a.kind.BASE')} · ` : c.kind === 'PRESENTATION' ? `${t('a.kind.PRESENTATION')} · ` : ''}{formatMoney(c.priceCents, locale)} · {t('a.recipe.inStock', { n: c.available })}</p></div>
                <div className="inline-flex items-center rounded border border-emerald/30"><button type="button" className="flex h-10 w-10 items-center justify-center" onClick={() => set(l.componentId, -1)} aria-label="−"><Minus size={15} aria-hidden /></button><span className="w-8 text-center font-semibold">{l.quantity}</span><button type="button" className="flex h-10 w-10 items-center justify-center" onClick={() => set(l.componentId, 1)} aria-label="+"><Plus size={15} aria-hidden /></button></div>
                <button type="button" className="flex h-10 w-10 items-center justify-center text-danger" onClick={() => setLines(lines.filter((x) => x.componentId !== l.componentId))} aria-label={t('a.recipe.remove')}><Trash2 size={17} aria-hidden /></button>
              </li>); })}
          </ul>
        )}
      </div>
      <div className="rounded bg-champagne/60 p-3 text-sm">
        <p>{t('a.recipe.retail', { amount: formatMoney(retail, locale) })} · <b>{t('a.recipe.price', { amount: formatMoney(priceCents, locale) })}</b></p>
        <p>{t('a.recipe.canMake', { n: can })}</p>
        <p className="text-muted">{t('a.recipe.priceNote')}</p>
      </div>
      <div>
        <label htmlFor="rq" className="label">{t('a.recipe.add')}</label>
        <div className="relative"><Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden /><input id="rq" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('a.recipe.search')} className="input !pl-10" autoComplete="off" /></div>
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
          {shown.map((c) => (
            <li key={c.id}><button type="button" onClick={() => setLines([...lines, { componentId: c.id, quantity: 1 }])} className="flex w-full items-center gap-3 rounded border border-gold-line bg-white p-2 text-left hover:border-gold">
              <img src={c.image ?? ''} alt="" className="h-10 w-10 shrink-0 rounded bg-champagne object-cover" /><span className="min-w-0 flex-1 truncate text-sm font-medium">{c.name}</span><Plus size={16} className="text-emerald" aria-hidden />
            </button></li>
          ))}
        </ul>
      </div>
    </div>
  );
}
