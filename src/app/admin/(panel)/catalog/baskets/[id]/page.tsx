import { notFound } from 'next/navigation';
import { getT } from '@/i18n/server';
import { prisma } from '@/lib/db';
import { available } from '@/lib/catalog';
import { loc } from '@/lib/i18n-labels';
import { Flash, ConfirmButton } from '@/components/admin/ui';
import { ProductForm } from '../ProductForm';
import { productState } from '../../../../actions';

export default async function BasketEditor({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { t, locale } = await getT();
  const [comps, cols, p] = await Promise.all([
    prisma.component.findMany({ where: { archived: false }, orderBy: [{ kind: 'asc' }, { nameFr: 'asc' }] }),
    prisma.collection.findMany({ where: { archived: false }, orderBy: { sortOrder: 'asc' } }),
    id === 'new' ? null : prisma.product.findUnique({ where: { id }, include: { images: { orderBy: { sortOrder: 'asc' } }, recipe: true, collections: true } }),
  ]);
  if (id !== 'new' && !p) notFound();
  return (
    <>
      <h2 className="mb-4 font-display text-2xl font-semibold">{p ? loc(p, 'name', locale) : t('a.baskets.add')}</h2>
      <Flash error={sp.error} />
      <ProductForm
        p={{ id: p?.id, nameFr: p?.nameFr ?? '', nameEn: p?.nameEn ?? '', descFr: p?.descFr ?? '', descEn: p?.descEn ?? '', priceCents: p?.priceCents ?? 0, featured: p?.featured ?? false, active: p?.active ?? true, images: p?.images.map((i) => i.url) ?? [], collectionIds: p?.collections.map((c) => c.collectionId) ?? [], recipe: p?.recipe.map((r) => ({ componentId: r.componentId, quantity: r.quantity })) ?? [] }}
        components={comps.map((c) => ({ id: c.id, name: loc(c, 'name', locale), kind: c.kind, image: c.imageUrl, priceCents: c.priceCents, available: available(c) }))}
        collections={cols.map((c) => ({ id: c.id, name: loc(c, 'name', locale) }))}
      />
      {p && (
        <div className="mt-8 flex flex-wrap gap-3 border-t border-gold-line pt-5">
          {!p.archived
            ? <ConfirmButton className="btn-outline btn-sm" danger={false} title={t('a.archive')} text={t('a.confirm.archiveProduct')} confirmLabel={t('a.archive')} formAction={async () => { 'use server'; const fd = new FormData(); fd.set('id', p.id); fd.set('op', 'archive'); await productState(fd); }}>{t('a.archive')}</ConfirmButton>
            : <form action={productState}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="op" value="restore" /><button className="btn-outline btn-sm">{t('a.restore')}</button></form>}
          <ConfirmButton title={t('a.delete')} text={t('a.confirm.deleteProduct')} confirmLabel={t('a.delete')} formAction={async () => { 'use server'; const fd = new FormData(); fd.set('id', p.id); fd.set('op', 'delete'); await productState(fd); }}>{t('a.delete')}</ConfirmButton>
        </div>
      )}
    </>
  );
}
