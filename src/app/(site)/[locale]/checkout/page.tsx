import { notFound } from 'next/navigation';
import { isLocale, makeT } from '@/i18n';
import { PageHeading } from '@/components/ui';
import { CheckoutForm, type DateChoice, type PayChoice } from '@/components/CheckoutForm';
import { getSettings, isFictionalEmail } from '@/lib/settings';
import { deliveryOptions } from '@/lib/quote';
import { formatDate, groupByCycle } from '@/lib/schedule';
import { expireReservations } from '@/lib/orders';
import { pageMeta } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return pageMeta({ locale, path: '/checkout', title: makeT(locale)('checkout.title'), noindex: true });
}

export default async function CheckoutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = makeT(locale);
  await expireReservations().catch(() => {});
  const [s, { options, paused }] = await Promise.all([getSettings(), deliveryOptions()]);
  const demo = s.store.mode === 'demo';
  const open = options.filter((o) => o.status === 'open' && !o.full).map((o) => o.date);
  const dates: DateChoice[] = groupByCycle(open, s.schedule).flatMap((g) => g.map((d) => ({ date: d, label: formatDate(d, locale), group: `${formatDate(g[0], locale, { day: 'numeric', month: 'long' })} → ${formatDate(g[g.length - 1], locale, { day: 'numeric', month: 'long' })}` })));

  const pay: PayChoice[] = [];
  const p = s.payments;
  const interacReady = p.interacEnabled && (demo || !isFictionalEmail(p.interacEmail));
  if (interacReady) pay.push({ method: 'INTERAC', label: t('pay.interac'), help: t('pay.interacHelp', { hours: p.interacDeadlineHours }) });
  if (p.codEnabled && p.codCash) pay.push({ method: 'COD_CASH', label: t('pay.codCash'), help: t('pay.codHelp') });
  if (p.codEnabled && p.codInterac) pay.push({ method: 'COD_INTERAC', label: t('pay.codInterac'), help: t('pay.codHelp') });

  const closedMessage = paused ? t('checkout.paused') : pay.length === 0 ? t('checkout.notLive') : null;
  return (<><PageHeading title={t('checkout.title')} /><CheckoutForm dates={dates} pay={pay} closedMessage={closedMessage} demo={demo} /></>);
}
