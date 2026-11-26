import type { MetadataRoute } from 'next';
import { getSettings } from '@/lib/settings';
import { siteUrl } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const demo = (await getSettings()).store.mode === 'demo';
  if (demo) return { rules: { userAgent: '*', disallow: '/' } };
  return { rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/api', '/fr/order', '/en/order', '/fr/my-orders', '/en/my-orders', '/fr/track', '/en/track', '/fr/checkout', '/en/checkout', '/fr/cart', '/en/cart'] }, sitemap: `${siteUrl()}/sitemap.xml` };
}
