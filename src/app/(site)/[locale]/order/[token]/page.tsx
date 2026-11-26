import { notFound } from 'next/navigation';
import { isLocale, makeT } from '@/i18n';
import { prisma } from '@/lib/db';
import { getSettings } from '@/lib/settings';
import { OrderDetail } from '@/components/OrderDetail';
import { pageMeta } from '@/lib/seo';

export const dynamic = 'force-dynamic';
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return pageMeta({ locale, path: '/order', title: makeT(locale)('order.pageTitle'), noindex: true });
}

export default async function OrderPage({ params, searchParams }: { params: Promise<{ locale: string; token: string }>; searchParams: Promise<{ placed?: string }> }) {
  const { locale, token } = await params;
  if (!isLocale(locale)) notFound();
  const { placed } = await searchParams;
  if (token.length < 20 || token.length > 80) notFound();
  const order = await prisma.order.findUnique({ where: { publicToken: token }, include: { items: true } });
  if (!order) notFound();
  const settings = await getSettings();
  return <OrderDetail order={order} settings={settings} locale={locale} placed={placed === '1'} />;
}
