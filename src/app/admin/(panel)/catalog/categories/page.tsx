import { getT } from '@/i18n/server';
import { prisma } from '@/lib/db';
import { BiField, Toggle, SubmitButton, Flash, ConfirmButton } from '@/components/admin/ui';
import { saveCategory, deleteCategory } from '../../../actions';

export default async function Categories({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const { t } = await getT();
  const cats = await prisma.category.findMany({ orderBy: { sortOrder: 'asc' }, include: { _count: { select: { components: true } } } });
  return (
    <>
      <Flash ok={sp.ok} error={sp.error} />
      <p className="mb-4 max-w-2xl text-muted">{t('a.categories.help')}</p>
      <div className="space-y-4">
        {cats.map((c) => (
          <form key={c.id} action={saveCategory} className="rounded-lg border border-gold-line bg-white p-4">
            <input type="hidden" name="id" value={c.id} />
            <div className="grid gap-4 md:grid-cols-[1fr_1fr_100px]"><BiField name="name" label={t('a.field.name')} defaultFr={c.nameFr} defaultEn={c.nameEn} /><div /><div><label className="label" htmlFor={`s${c.id}`}>{t('a.field.order')}</label><input id={`s${c.id}`} name="sort" type="number" defaultValue={c.sortOrder} className="input" /></div></div>
            <div className="mt-3 flex flex-wrap items-center gap-4"><Toggle name="active" label={t('a.field.shown')} defaultChecked={c.active} /><span className="text-sm text-muted">{t('a.categories.count', { n: c._count.components })}</span>
              <span className="ml-auto flex gap-2"><SubmitButton className="btn-emerald btn-sm">{t('a.save')}</SubmitButton>
                {c._count.components === 0 && <ConfirmButton title={t('a.delete')} text={t('a.confirm.deleteCategory')} confirmLabel={t('a.delete')} formAction={async () => { 'use server'; const fd = new FormData(); fd.set('id', c.id); await deleteCategory(fd); }}>{t('a.delete')}</ConfirmButton>}</span></div>
          </form>
        ))}
        <form action={saveCategory} className="rounded-lg border-2 border-dashed border-gold bg-white p-4"><h2 className="mb-3 font-display text-lg font-semibold">{t('a.categories.add')}</h2>
          <input type="hidden" name="active" value="on" /><div className="grid gap-4 md:grid-cols-[1fr_100px]"><BiField name="name" label={t('a.field.name')} /><div><label className="label" htmlFor="ns">{t('a.field.order')}</label><input id="ns" name="sort" type="number" defaultValue={cats.length} className="input" /></div></div>
          <div className="mt-3"><SubmitButton>{t('a.categories.add')}</SubmitButton></div></form>
      </div>
    </>
  );
}
