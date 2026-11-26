import { getT } from '@/i18n/server';
import { prisma } from '@/lib/db';
import { loc } from '@/lib/i18n-labels';
import { formatMoney } from '@/lib/money';
import { Flash } from '@/components/admin/ui';
import { Img } from '@/components/ui';
import { productState } from '../../../actions';

export default async function Featured({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const sp = await searchParams;
  const { t, locale } = await getT();
  const products = await prisma.product.findMany({ where: { archived: false }, include: { images: { take: 1, orderBy: { sortOrder: 'asc' } } }, orderBy: [{ featured: 'desc' }, { sortOrder: 'asc' }] });
  return (
    <>
      <Flash ok={sp.ok} />
      <p className="mb-4 max-w-2xl text-muted">{t('a.featured.help')}</p>
      <ul className="divide-y divide-gold-line/60 rounded-lg border border-gold-line bg-white">
        {products.map((p) => (
          <li key={p.id} className="flex items-center gap-3 p-3">
            <Img src={p.images[0]?.url} alt="" ratio="1 / 1" className="h-14 w-14 shrink-0 rounded" />
            <div className="min-w-0 flex-1"><p className="font-medium">{loc(p, 'name', locale)}</p><p className="text-sm text-muted">{formatMoney(p.priceCents, locale)}{!p.active && ` · ${t('a.inactive')}`}</p></div>
            <form action={productState}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="op" value="feature" /><input type="hidden" name="back" value="/admin/storefront/featured" /><button className={p.featured ? 'btn-gold btn-sm' : 'btn-outline btn-sm'} aria-pressed={p.featured}>{p.featured ? t('a.featured.on') : t('a.featured.off')}</button></form>
          </li>
        ))}
      </ul>
    </>
  );
}
