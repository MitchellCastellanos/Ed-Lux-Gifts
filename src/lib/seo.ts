import type { Metadata } from 'next';
import { getSettings } from './settings';
import type { Locale } from './money';

/** Default social-share image (1200×630). */
export const DEFAULT_OG = '/images/og/og-default.jpg';

const SITE = () => (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

export async function pageMeta(o: { locale: Locale; path: string; title: string; description?: string; image?: string | null; noindex?: boolean }): Promise<Metadata> {
  const s = await getSettings();
  const demo = s.store.mode === 'demo';
  const p = o.path === '/' ? '' : o.path;
  return {
    title: o.title,
    description: o.description,
    alternates: { canonical: `${SITE()}/${o.locale}${p}`, languages: { 'fr-CA': `${SITE()}/fr${p}`, 'en-CA': `${SITE()}/en${p}`, 'x-default': `${SITE()}/fr${p}` } },
    openGraph: { title: o.title, description: o.description, url: `${SITE()}/${o.locale}${p}`, siteName: 'ED LUX GIFTS', locale: o.locale === 'fr' ? 'fr_CA' : 'en_CA', type: 'website', images: o.image ? [{ url: o.image }] : [{ url: DEFAULT_OG, width: 1200, height: 630, alt: 'ED LUX GIFTS' }] },
    twitter: { card: 'summary_large_image', title: o.title, description: o.description, images: [o.image ?? DEFAULT_OG] },
    robots: o.noindex || demo ? { index: false, follow: false } : undefined,
  };
}

export const siteUrl = SITE;

export function formatTime(hhmm: string, locale: Locale): string {
  const [h, m] = hhmm.split(':').map(Number);
  if (locale === 'fr') return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`;
  const ap = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 || 12;
  return m ? `${hh}:${String(m).padStart(2, '0')} ${ap}` : `${hh} ${ap}`;
}
