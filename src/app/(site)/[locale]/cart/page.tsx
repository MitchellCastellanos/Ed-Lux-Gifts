import { notFound } from 'next/navigation';
import { isLocale, makeT } from '@/i18n';
import { PageHeading } from '@/components/ui';
import { CartView } from '@/components/CartView';
import { pageMeta } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return pageMeta({ locale, path: '/cart', title: makeT(locale)('cart.title'), noindex: true });
}
export default async function CartPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (<><PageHeading title={makeT(locale)('cart.title')} /><CartView /></>);
}
