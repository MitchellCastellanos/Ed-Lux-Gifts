import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isLocale, makeT } from '@/i18n';
import { prisma } from '@/lib/db';
import { productInclude, visibleCollections } from '@/lib/catalog';
import { loc } from '@/lib/i18n-labels';
import { pageMeta } from '@/lib/seo';
import { ProductCard } from '@/components/ProductCard';
import { PageHeading } from '@/components/ui';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = makeT(locale);
  return pageMeta({ locale, path: '/baskets', title: t('catalog.title'), description: t('catalog.desc') });
}

export default async function Catalog({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ q?: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { q } = await searchParams;
  const t = makeT(locale);
  const term = (q ?? '').trim().slice(0, 60);
  const [products, cols] = await Promise.all([
    prisma.product.findMany({
      where: { active: true, archived: false, ...(term ? { OR: [{ nameFr: { contains: term, mode: 'insensitive' } }, { nameEn: { contains: term, mode: 'insensitive' } }, { descFr: { contains: term, mode: 'insensitive' } }, { descEn: { contains: term, mode: 'insensitive' } }] } : {}) },
      include: productInclude, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    }),
    visibleCollections(),
  ]);
  return (
    <>
      <PageHeading title={t('catalog.title')} sub={term ? t('catalog.searchResults', { q: term }) : t('catalog.desc')} />
      <div className="container-page py-8">
        {cols.length > 0 && (
          <nav aria-label={t('catalog.collections')} className="mb-6 flex flex-wrap gap-2">
            <span className="btn-emerald btn-sm" aria-current="page">{t('catalog.all')}</span>
            {cols.map((c) => <Link key={c.id} href={`/${locale}/collections/${c.slug}`} className="btn-outline btn-sm">{loc(c, 'name', locale)}</Link>)}
          </nav>
        )}
        {products.length === 0 ? (
          <div className="card p-10 text-center"><p className="font-display text-xl">{t('catalog.empty')}</p><Link href={`/${locale}/build`} className="btn-emerald mt-5">{t('nav.build')}</Link></div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">{products.map((p) => <ProductCard key={p.id} p={p} locale={locale} t={t} />)}</div>
        )}
      </div>
    </>
  );
}
