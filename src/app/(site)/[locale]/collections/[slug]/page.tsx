import { notFound } from 'next/navigation';
import { isLocale, makeT } from '@/i18n';
import { prisma } from '@/lib/db';
import { activeProducts } from '@/lib/catalog';
import { loc } from '@/lib/i18n-labels';
import { pageMeta } from '@/lib/seo';
import { ProductCard } from '@/components/ProductCard';
import { PageHeading } from '@/components/ui';

async function getCol(slug: string) {
  const c = await prisma.collection.findUnique({ where: { slug } });
  return c && c.active && !c.archived ? c : null;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const c = await getCol(slug);
  if (!c) return {};
  return pageMeta({ locale, path: `/collections/${slug}`, title: loc(c, 'name', locale), description: loc(c, 'desc', locale), image: c.imageUrl });
}

export default async function CollectionPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const t = makeT(locale);
  const c = await getCol(slug);
  if (!c) notFound();
  const products = await activeProducts({ collectionSlug: slug });
  if (products.length === 0) notFound(); // empty collections are hidden automatically
  return (
    <>
      <PageHeading title={loc(c, 'name', locale)} sub={loc(c, 'desc', locale)} />
      <div className="container-page py-8"><div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">{products.map((p) => <ProductCard key={p.id} p={p} locale={locale} t={t} />)}</div></div>
    </>
  );
}
