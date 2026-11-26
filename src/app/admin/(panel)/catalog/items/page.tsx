import Link from 'next/link';
import { Plus } from 'lucide-react';
import { getT } from '@/i18n/server';
import { prisma } from '@/lib/db';
import { available } from '@/lib/catalog';
import { loc } from '@/lib/i18n-labels';
import { formatMoney } from '@/lib/money';
import { Flash } from '@/components/admin/ui';
import { Img } from '@/components/ui';

export default async function ItemsList({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const { t, locale } = await getT();
  const [comps, cats] = await Promise.all([prisma.component.findMany({ where: { kind: { in: ['ITEM', 'PRESENTATION'] } }, orderBy: [{ archived: 'asc' }, { sortOrder: 'asc' }] }), prisma.category.findMany({ orderBy: { sortOrder: 'asc' } })]);
  const groups = [...cats.map((c) => ({ key: c.id, title: loc(c, 'name', locale), list: comps.filter((i) => i.kind === 'ITEM' && i.categoryId === c.id) })), { key: 'none', title: t('a.noCategory'), list: comps.filter((i) => i.kind === 'ITEM' && !i.categoryId) }, { key: 'opt', title: t('a.kind.PRESENTATION'), list: comps.filter((i) => i.kind === 'PRESENTATION') }].filter((g) => g.list.length);
  const Row = ({ c }: { c: (typeof comps)[number] }) => (
    <li className={`flex items-center gap-3 p-2.5 ${c.archived ? 'opacity-60' : ''}`}>
      <Img src={c.imageUrl} alt="" ratio="1 / 1" className="h-14 w-14 shrink-0 rounded border border-gold-line" />
      <div className="min-w-0 flex-1"><Link href={`/admin/catalog/items/${c.id}`} className="font-medium text-emerald underline-offset-2 hover:underline">{loc(c, 'name', locale)}</Link><p className="text-sm text-muted">{formatMoney(c.priceCents, locale)} · {t('a.stock.avail', { n: available(c) })}{c.archived ? ` · ${t('a.archived')}` : !c.active ? ` · ${t('a.inactive')}` : ''}</p></div>
      <Link href={`/admin/catalog/items/${c.id}`} className="btn-outline btn-sm">{t('a.edit')}</Link>
    </li>
  );
  return (
    <>
      <Flash ok={sp.ok} error={sp.error} />
      <div className="mb-4 flex flex-wrap justify-end gap-3"><Link href="/admin/catalog/items/new?kind=PRESENTATION" className="btn-outline"><Plus size={18} aria-hidden /> {t('a.options.add')}</Link><Link href="/admin/catalog/items/new" className="btn-emerald"><Plus size={18} aria-hidden /> {t('a.items.add')}</Link></div>
      {groups.length === 0 && <div className="rounded-lg border border-dashed border-gold-line bg-white p-10 text-center">{t('a.items.empty')}</div>}
      <div className="space-y-5">{groups.map((g) => <section key={g.key}><h2 className="mb-2 font-display text-lg font-semibold">{g.title}</h2><ul className="divide-y divide-gold-line/60 rounded-lg border border-gold-line bg-white">{g.list.map((c) => <Row key={c.id} c={c} />)}</ul></section>)}</div>
    </>
  );
}
