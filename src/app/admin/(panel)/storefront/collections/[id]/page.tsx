import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getT } from '@/i18n/server';
import { prisma } from '@/lib/db';
import { loc } from '@/lib/i18n-labels';
import { BiField, ImageField, Toggle, SubmitButton, Flash } from '@/components/admin/ui';
import { saveCollection } from '../../../../actions';

export default async function CollectionEditor({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { t, locale } = await getT();
  const [c, products] = await Promise.all([id === 'new' ? null : prisma.collection.findUnique({ where: { id }, include: { products: true } }), prisma.product.findMany({ where: { archived: false }, orderBy: { sortOrder: 'asc' } })]);
  if (id !== 'new' && !c) notFound();
  const card = 'space-y-5 rounded-lg border border-gold-line bg-white p-5';
  return (
    <>
      <h2 className="mb-4 font-display text-2xl font-semibold">{c ? loc(c, 'name', locale) : t('a.collections.add')}</h2>
      <Flash error={sp.error} />
      <form action={saveCollection} className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <input type="hidden" name="id" value={c?.id ?? ''} />
        <div className={card}>
          <BiField name="name" label={t('a.field.name')} defaultFr={c?.nameFr} defaultEn={c?.nameEn} required hint={t('a.collections.nameHelp')} />
          <BiField name="desc" label={t('a.field.description')} defaultFr={c?.descFr} defaultEn={c?.descEn} textarea rows={2} />
          <ImageField name="image" label={t('a.field.coverImage')} defaultValue={c?.imageUrl ?? ''} aspect="16 / 9" wide />
          <div className="max-w-[160px]"><label className="label" htmlFor="so">{t('a.field.order')}</label><input id="so" name="sort" type="number" defaultValue={c?.sortOrder ?? 0} className="input" /></div>
        </div>
        <div className="space-y-6">
          <section className={card}><Toggle name="active" label={t('a.field.active')} defaultChecked={c?.active ?? true} hint={t('a.collections.activeHelp')} /></section>
          <section className={card}><h2 className="font-display text-xl font-semibold">{t('a.collections.assign')}</h2>
            {products.length === 0 ? <p className="text-sm text-muted">{t('a.baskets.empty')}</p> : products.map((p) => <label key={p.id} className="flex items-center gap-3 py-1"><input type="checkbox" name="productIds" value={p.id} defaultChecked={c?.products.some((x) => x.productId === p.id)} className="h-5 w-5 accent-emerald" />{loc(p, 'name', locale)}{!p.active && <span className="text-xs text-muted">({t('a.inactive')})</span>}</label>)}</section>
          <div className="sticky bottom-20 z-10 flex gap-3 rounded-lg border border-gold-line bg-white/95 p-3 backdrop-blur lg:bottom-4"><SubmitButton className="btn-emerald flex-1">{t('a.save')}</SubmitButton><Link href="/admin/storefront/collections" className="btn-outline">{t('a.cancel')}</Link></div>
        </div>
      </form>
    </>
  );
}
