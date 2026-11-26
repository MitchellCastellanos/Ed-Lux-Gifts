import { getT } from '@/i18n/server';
import { prisma } from '@/lib/db';
import { loc } from '@/lib/i18n-labels';
import { centsToInput } from '@/lib/money';
import { BiField, ImageField, Toggle, SubmitButton, ConfirmButton } from '@/components/admin/ui';
import { saveComponent, componentState } from '../../actions';
import { available } from '@/lib/catalog';
import Link from 'next/link';

export async function ComponentForm({ id, kind }: { id: string; kind: 'ITEM' | 'BASE' | 'PRESENTATION' }) {
  const { t, locale } = await getT();
  const c = id === 'new' ? null : await prisma.component.findUnique({ where: { id } });
  const [cats, options] = await Promise.all([
    kind === 'ITEM' ? prisma.category.findMany({ orderBy: { sortOrder: 'asc' } }) : [],
    kind === 'BASE' ? prisma.component.findMany({ where: { kind: 'PRESENTATION', archived: false }, orderBy: { sortOrder: 'asc' } }) : [],
  ]);
  const back = kind === 'BASE' ? '/admin/catalog/bases' : '/admin/catalog/items';
  const card = 'space-y-5 rounded-lg border border-gold-line bg-white p-5';
  return (
    <>
      <form action={saveComponent} className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <input type="hidden" name="id" value={c?.id ?? ''} /><input type="hidden" name="kind" value={kind} />
        <div className="space-y-6">
          <section className={card}>
            <h2 className="font-display text-xl font-semibold">{t('a.section.basics')}</h2>
            <BiField name="name" label={t('a.field.name')} defaultFr={c?.nameFr} defaultEn={c?.nameEn} required />
            <BiField name="desc" label={t('a.field.description')} defaultFr={c?.descFr} defaultEn={c?.descEn} textarea rows={2} hint={kind === 'PRESENTATION' ? t('a.field.optionDescHelp') : undefined} />
            <ImageField name="image" label={t('a.field.photo')} defaultValue={c?.imageUrl ?? ''} />
          </section>
          <section className={card}>
            <h2 className="font-display text-xl font-semibold">{t('a.section.pricing')}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="label" htmlFor="price">{kind === 'PRESENTATION' ? t('a.field.extraPrice') : kind === 'BASE' ? t('a.field.basePrice') : t('a.field.unitPrice')}</label><input id="price" name="price" inputMode="decimal" defaultValue={centsToInput(c?.priceCents ?? 0, locale)} className="input" /><p className="hint">{kind === 'PRESENTATION' ? t('a.field.extraPriceHelp') : t('a.field.priceHelp')}</p></div>
              {kind === 'ITEM' && <div><label className="label" htmlFor="cc">{t('a.field.capacityCost')}</label><input id="cc" name="capacityCost" type="number" min={0} defaultValue={c?.capacityCost ?? 1} className="input" /><p className="hint">{t('a.field.capacityCostHelp')}</p></div>}
              {kind === 'BASE' && <div><label className="label" htmlFor="cap">{t('a.field.capacity')}</label><input id="cap" name="capacity" type="number" min={1} defaultValue={c?.capacity ?? 8} className="input" /><p className="hint">{t('a.field.capacityHelp')}</p></div>}
            </div>
            {kind === 'BASE' && (
              <div><p className="label">{t('a.field.includedOptions')}</p><p className="mb-1 text-sm text-muted">{t('a.field.includedOptionsHelp')}</p>
                {options.map((o) => <label key={o.id} className="flex items-center gap-3 py-1"><input type="checkbox" name="included" value={o.id} defaultChecked={c?.includedOptionIds.includes(o.id)} className="h-5 w-5 accent-emerald" />{loc(o, 'name', locale)}</label>)}</div>
            )}
          </section>
          <section className={card}>
            <h2 className="font-display text-xl font-semibold">{t('a.section.stock')}</h2>
            {c ? <p className="text-[15px]">{t('a.stock.current', { onHand: c.stockOnHand, reserved: c.stockReserved, avail: available(c) })} <Link href="/admin/catalog/inventory" className="font-medium text-emerald underline">{t('a.stock.update')}</Link></p>
              : <div className="max-w-[220px]"><label className="label" htmlFor="stock">{t('a.stock.initial')}</label><input id="stock" name="stock" type="number" min={0} defaultValue={0} className="input" /></div>}
            <div className="max-w-[260px]"><label className="label" htmlFor="low">{t('a.field.lowStock')}</label><input id="low" name="low" type="number" min={0} defaultValue={c?.lowStockThreshold ?? 3} className="input" /><p className="hint">{t('a.field.lowStockHelp')}</p></div>
          </section>
        </div>
        <div className="space-y-6">
          <section className={card}><h2 className="font-display text-xl font-semibold">{t('a.section.visibility')}</h2>
            <Toggle name="active" label={t('a.field.available')} defaultChecked={c?.active ?? true} hint={t('a.field.availableHelp')} />
            {kind === 'ITEM' && <Toggle name="customEligible" label={t('a.field.custom')} defaultChecked={c?.customEligible ?? true} hint={t('a.field.customHelp')} />}
            {kind === 'ITEM' && <div><label className="label" htmlFor="cat">{t('a.field.category')}</label><select id="cat" name="categoryId" defaultValue={c?.categoryId ?? ''} className="input"><option value="">—</option>{cats.map((k) => <option key={k.id} value={k.id}>{loc(k, 'name', locale)}</option>)}</select></div>}
          </section>
          <div className="sticky bottom-20 z-10 flex gap-3 rounded-lg border border-gold-line bg-white/95 p-3 backdrop-blur lg:bottom-4"><SubmitButton className="btn-emerald flex-1">{t('a.save')}</SubmitButton><Link href={back} className="btn-outline">{t('a.cancel')}</Link></div>
        </div>
      </form>
      {c && (
        <div className="mt-8 flex flex-wrap gap-3 border-t border-gold-line pt-5">
          {!c.archived
            ? <ConfirmButton className="btn-outline btn-sm" danger={false} title={t('a.archive')} text={t('a.confirm.archiveItem')} confirmLabel={t('a.archive')} formAction={async () => { 'use server'; const fd = new FormData(); fd.set('id', c.id); fd.set('op', 'archive'); await componentState(fd); }}>{t('a.archive')}</ConfirmButton>
            : <form action={componentState}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="op" value="restore" /><button className="btn-outline btn-sm">{t('a.restore')}</button></form>}
          <ConfirmButton title={t('a.delete')} text={t('a.confirm.deleteItem')} confirmLabel={t('a.delete')} formAction={async () => { 'use server'; const fd = new FormData(); fd.set('id', c.id); fd.set('op', 'delete'); await componentState(fd); }}>{t('a.delete')}</ConfirmButton>
        </div>
      )}
    </>
  );
}
