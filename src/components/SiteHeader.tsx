import { visibleCollections } from '@/lib/catalog';
import { loc } from '@/lib/i18n-labels';
import { Header } from './Header';
import type { Locale } from '@/lib/money';

export async function SiteHeader({ locale }: { locale: Locale }) {
  const cols = await visibleCollections();
  return <Header collections={cols.map((c) => ({ slug: c.slug, name: loc(c, 'name', locale) }))} />;
}
