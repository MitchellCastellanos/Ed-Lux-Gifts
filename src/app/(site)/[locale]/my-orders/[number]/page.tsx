import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { isLocale, makeT } from '@/i18n';
import { getSettings } from '@/lib/settings';
import { getCustomerSession, sessionOrders, SESSION_COOKIE } from '@/lib/verification';
import { OrderDetail } from '@/components/OrderDetail';
import { pageMeta } from '@/lib/seo';

export const dynamic = 'force-dynamic';
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return pageMeta({ locale, path: '/my-orders', title: makeT(locale)('orders.title'), noindex: true });
}

export default async function MyOrderDetail({ params }: { params: Promise<{ locale: string; number: string }> }) {
  const { locale, number } = await params;
  if (!isLocale(locale)) notFound();
  const s = await getCustomerSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!s) redirect(`/${locale}/my-orders`);
  const order = (await sessionOrders(s)).find((o) => o.number === number.toUpperCase()); // only orders matching verified email + phone
  if (!order) notFound();
  return <OrderDetail order={order} settings={await getSettings()} locale={locale} backHref={`/${locale}/my-orders`} />;
}
