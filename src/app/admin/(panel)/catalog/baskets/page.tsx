import Link from 'next/link';
import { Plus } from 'lucide-react';
import { getT } from '@/i18n/server';
import { prisma } from '@/lib/db';
import { productInclude, productStock } from '@/lib/catalog';
import { loc } from '@/lib/i18n-labels';
import { formatMoney } from '@/lib/money';
import { Flash } from '@/components/admin/ui';
import { Img } from '@/components/ui';
import { productState } from '../../../actions';

export default async function BasketsList({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string; note?: string }> }) {
  const sp = await searchParams;
  const { t, locale } = await getT();
  const products = await prisma.product.findMany({ include: productInclude, orderBy: [{ archived: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }] });
  return (
    <>
      <Flash ok={sp.ok} error={sp.error} />
      {sp.note === 'archived' && <p className="mb-4 rounded bg-champagne/70 px-3 py-2 text-sm">{t('a.archivedInstead')}</p>}
      <div className="mb-4 flex justify-end"><Link href="/admin/catalog/baskets/new" className="btn-emerald"><Plus size={18} aria-hidden /> {t('a.baskets.add')}</Link></div>
      {products.length === 0 ? <div className="rounded-lg border border-dashed border-gold-line bg-white p-10 text-center"><p className="font-display text-xl">{t('a.baskets.empty')}</p></div> : (
        <ul className="grid gap-3 md:grid-cols-2">
          {products.map((p) => { const st = productStock(p); return (
            <li key={p.id} className={`flex gap-4 rounded-lg border border-gold-line bg-white p-3 ${p.archived ? 'opacity-60' : ''}`}>
              <Img src={p.images[0]?.url} alt="" ratio="4 / 5" className="w-24 shrink-0 rounded" />
              <div className="flex min-w-0 flex-1 flex-col">
                <Link href={`/admin/catalog/baskets/${p.id}`} className="font-display text-lg font-semibold leading-snug text-emerald underline-offset-2 hover:underline">{loc(p, 'name', locale)}</Link>
                <p className="font-semibold">{formatMoney(p.priceCents, locale)}</p>
                <p className="text-sm text-muted">{p.collections.map((c) => loc(c.collection, 'name', locale)).join(', ') || t('a.baskets.noCollection')}</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {p.archived ? <span className="badge border-neutral-400 bg-neutral-100">{t('a.archived')}</span> : <span className={`badge ${p.active ? 'border-emerald/40 bg-emerald-soft text-emerald' : 'border-neutral-400 bg-neutral-100'}`}>{p.active ? t('a.active') : t('a.inactive')}</span>}
                  {p.featured && <span className="badge border-gold bg-champagne text-gold-deep">{t('a.featured')}</span>}
                  <span className={`badge ${st === 0 ? 'border-red-300 bg-red-50 text-red-900' : st <= 3 ? 'border-amber-400 bg-amber-50 text-amber-900' : 'border-emerald/40 bg-emerald-soft text-emerald'}`}>{t('a.baskets.canMake', { n: st })}</span>
                </div>
                <div className="mt-auto flex flex-wrap gap-2 pt-3">
                  <Link href={`/admin/catalog/baskets/${p.id}`} className="btn-outline btn-sm">{t('a.edit')}</Link>
                  {!p.archived && <form action={productState}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="op" value="toggle" /><button className="btn-ghost btn-sm">{p.active ? t('a.disable') : t('a.enable')}</button></form>}
                </div>
              </div>
            </li>); })}
        </ul>
      )}
    </>
  );
}
