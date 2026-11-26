'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/i18n/client';
import { BiField, ImageField, Toggle, SubmitButton } from '@/components/admin/ui';
import { RecipeEditor, type RComp } from './RecipeEditor';
import { saveProduct } from '../../../actions';
import { centsToInput, formatMoney } from '@/lib/money';

type P = { id?: string; nameFr: string; nameEn: string; descFr: string; descEn: string; priceCents: number; featured: boolean; active: boolean; images: string[]; collectionIds: string[]; recipe: { componentId: string; quantity: number }[] };

export function ProductForm({ p, components, collections }: { p: P; components: RComp[]; collections: { id: string; name: string }[] }) {
  const { t, locale } = useI18n();
  const [price, setPrice] = useState(centsToInput(p.priceCents, locale));
  const cents = Math.round(parseFloat(price.replace(',', '.')) * 100) || 0;
  return (
    <form action={saveProduct} className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <input type="hidden" name="id" value={p.id ?? ''} />
      <div className="space-y-6">
        <section className="space-y-5 rounded-lg border border-gold-line bg-white p-5">
          <h2 className="font-display text-xl font-semibold">{t('a.section.basics')}</h2>
          <BiField name="name" label={t('a.field.name')} defaultFr={p.nameFr} defaultEn={p.nameEn} required />
          <BiField name="desc" label={t('a.field.description')} defaultFr={p.descFr} defaultEn={p.descEn} textarea rows={4} />
          <div className="max-w-[220px]"><label className="label" htmlFor="price">{t('a.field.sellingPrice')} *</label><input id="price" name="price" inputMode="decimal" required value={price} onChange={(e) => setPrice(e.target.value)} className="input" /><p className="hint">{t('a.field.sellingPriceHelp')}</p></div>
          <ImageField name="images" label={t('a.field.photos')} defaultValue={p.images.join('\n')} multiple aspect="4 / 5" hint={t('a.field.photosHelp')} />
        </section>
        <section className="rounded-lg border border-gold-line bg-white p-5"><h2 className="mb-3 font-display text-xl font-semibold">{t('a.recipe.title')}</h2><p className="mb-4 text-sm text-muted">{t('a.recipe.help')}</p>
          <RecipeEditor components={components} initial={p.recipe} priceCents={cents} /></section>
      </div>
      <div className="space-y-6">
        <section className="rounded-lg border border-gold-line bg-white p-5"><h2 className="mb-2 font-display text-xl font-semibold">{t('a.section.visibility')}</h2>
          <Toggle name="active" label={t('a.field.active')} defaultChecked={p.active} hint={t('a.field.activeHelp')} /><Toggle name="featured" label={t('a.field.featured')} defaultChecked={p.featured} hint={t('a.field.featuredHelp')} /></section>
        <section className="rounded-lg border border-gold-line bg-white p-5"><h2 className="mb-2 font-display text-xl font-semibold">{t('a.field.collections')}</h2>
          {collections.length === 0 ? <p className="text-sm text-muted">{t('a.field.noCollections')}</p> : collections.map((c) => <label key={c.id} className="flex items-center gap-3 py-1.5"><input type="checkbox" name="collectionIds" value={c.id} defaultChecked={p.collectionIds.includes(c.id)} className="h-5 w-5 accent-emerald" />{c.name}</label>)}</section>
        <div className="sticky bottom-20 z-10 flex gap-3 rounded-lg border border-gold-line bg-white/95 p-3 backdrop-blur lg:bottom-4"><SubmitButton className="btn-emerald flex-1">{t('a.save')}</SubmitButton><Link href="/admin/catalog/baskets" className="btn-outline">{t('a.cancel')}</Link></div>
        <p className="text-xs text-muted">{formatMoney(cents, locale)}</p>
      </div>
    </form>
  );
}
