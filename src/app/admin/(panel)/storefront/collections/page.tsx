import Link from 'next/link';
import { Plus } from 'lucide-react';
import { getT } from '@/i18n/server';
import { prisma } from '@/lib/db';
import { loc } from '@/lib/i18n-labels';
import { Flash } from '@/components/admin/ui';
import { Img } from '@/components/ui';
import { collectionState } from '../../../actions';

export default async function CollectionsList({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const sp = await searchParams;
  const { t, locale } = await getT();
  const cols = await prisma.collection.findMany({ orderBy: [{ archived: 'asc' }, { sortOrder: 'asc' }], include: { products: { include: { product: true } } } });
  return (
    <>
      <Flash ok={sp.ok} />
      <div className="mb-4 flex items-center justify-between gap-3"><p className="max-w-xl text-muted">{t('a.collections.help')}</p><Link href="/admin/storefront/collections/new" className="btn-emerald shrink-0"><Plus size={18} aria-hidden /> {t('a.collections.add')}</Link></div>
      {cols.length === 0 && <div className="rounded-lg border border-dashed border-gold-line bg-white p-10 text-center">{t('a.collections.empty')}</div>}
      <ul className="grid gap-3 md:grid-cols-2">
        {cols.map((c) => { const live = c.products.filter((p) => p.product.active && !p.product.archived).length; const visible = c.active && !c.archived && live > 0; return (
          <li key={c.id} className={`flex gap-3 rounded-lg border border-gold-line bg-white p-3 ${c.archived ? 'opacity-60' : ''}`}>
            <Img src={c.imageUrl} alt="" ratio="16 / 10" className="w-32 shrink-0 self-start rounded" />
            <div className="min-w-0 flex-1"><Link href={`/admin/storefront/collections/${c.id}`} className="font-display text-lg font-semibold text-emerald hover:underline">{loc(c, 'name', locale)}</Link>
              <p className="text-sm text-muted">{t('a.collections.count', { n: live })}</p>
              <p className="mt-1"><span className={`badge ${visible ? 'border-emerald/40 bg-emerald-soft text-emerald' : 'border-neutral-400 bg-neutral-100'}`}>{c.archived ? t('a.archived') : visible ? t('a.collections.visible') : !c.active ? t('a.inactive') : t('a.collections.hiddenEmpty')}</span></p>
              <div className="mt-2 flex flex-wrap gap-2"><Link className="btn-outline btn-sm" href={`/admin/storefront/collections/${c.id}`}>{t('a.edit')}</Link>
                {!c.archived && <form action={collectionState}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="op" value={c.active ? 'deactivate' : 'activate'} /><button className="btn-ghost btn-sm">{c.active ? t('a.disable') : t('a.enable')}</button></form>}
                <form action={collectionState}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="op" value={c.archived ? 'restore' : 'archive'} /><button className="btn-ghost btn-sm">{c.archived ? t('a.restore') : t('a.archive')}</button></form></div></div>
          </li>); })}
      </ul>
    </>
  );
}
