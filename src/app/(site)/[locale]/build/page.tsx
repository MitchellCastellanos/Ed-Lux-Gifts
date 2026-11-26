import { notFound } from 'next/navigation';
import { isLocale, makeT } from '@/i18n';
import { prisma } from '@/lib/db';
import { available } from '@/lib/catalog';
import { loc } from '@/lib/i18n-labels';
import { pageMeta } from '@/lib/seo';
import { PageHeading } from '@/components/ui';
import { Builder } from '@/components/Builder';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = makeT(locale);
  return pageMeta({ locale, path: '/build', title: t('build.title'), description: t('build.desc') });
}

export default async function BuildPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = makeT(locale);
  const [comps, cats] = await Promise.all([
    prisma.component.findMany({ where: { active: true, archived: false }, orderBy: [{ sortOrder: 'asc' }, { nameFr: 'asc' }] }),
    prisma.category.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } }),
  ]);
  const items = comps.filter((c) => c.kind === 'ITEM' && c.customEligible && c.categoryId);
  const categories = cats.filter((c) => items.some((i) => i.categoryId === c.id)).map((c) => ({ id: c.id, name: loc(c, 'name', locale) }));
  return (
    <>
      <PageHeading title={t('build.title')} sub={t('build.desc')} />
      <Builder
        bases={comps.filter((c) => c.kind === 'BASE').map((b) => ({ id: b.id, name: loc(b, 'name', locale), image: b.imageUrl, priceCents: b.priceCents, capacity: b.capacity, available: available(b), includedOptionIds: b.includedOptionIds }))}
        items={items.map((i) => ({ id: i.id, name: loc(i, 'name', locale), image: i.imageUrl, priceCents: i.priceCents, cost: i.capacityCost, available: available(i), categoryId: i.categoryId! }))}
        categories={categories}
        options={comps.filter((c) => c.kind === 'PRESENTATION').map((o) => ({ id: o.id, name: loc(o, 'name', locale), desc: loc(o, 'desc', locale), image: o.imageUrl, priceCents: o.priceCents, available: available(o) }))}
      />
    </>
  );
}
