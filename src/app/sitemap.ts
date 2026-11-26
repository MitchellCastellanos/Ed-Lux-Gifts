import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/db';
import { visibleCollections } from '@/lib/catalog';
import { siteUrl } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, cols] = await Promise.all([prisma.product.findMany({ where: { active: true, archived: false }, select: { slug: true, updatedAt: true } }), visibleCollections()]);
  const paths = ['', '/baskets', '/build', '/delivery', '/about', '/privacy', '/terms', ...cols.map((c) => `/collections/${c.slug}`), ...products.map((p) => `/baskets/${p.slug}`)];
  return paths.flatMap((p) => ['fr', 'en'].map((l) => ({ url: `${siteUrl()}/${l}${p}`, alternates: { languages: { 'fr-CA': `${siteUrl()}/fr${p}`, 'en-CA': `${siteUrl()}/en${p}` } } })));
}
