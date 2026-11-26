import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { isLocale, makeT } from '@/i18n';
import { PageHeading, Img, Notice } from '@/components/ui';
import { CodeFlow } from '@/components/CodeFlow';
import { LogoutButton } from '@/components/LogoutButton';
import { StatusBadge } from '@/components/StatusBadge';
import { getSettings } from '@/lib/settings';
import { pageMeta } from '@/lib/seo';
import { emailConfigured } from '@/lib/email';
import { getCustomerSession, sessionOrders, SESSION_COOKIE } from '@/lib/verification';
import { formatMoney } from '@/lib/money';
import { formatDate, formatDateTime } from '@/lib/schedule';

export const dynamic = 'force-dynamic';
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return pageMeta({ locale, path: '/my-orders', title: makeT(locale)('orders.title'), noindex: true });
}

export default async function MyOrders({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = makeT(locale);
  const s = await getSettings();
  const session = await getCustomerSession((await cookies()).get(SESSION_COOKIE)?.value);
  const orders = session ? await sessionOrders(session) : null;

  if (!orders) {
    return (
      <>
        <PageHeading title={t('orders.title')} sub={t('orders.sub')} />
        <div className="container-page grid max-w-5xl gap-6 py-8 md:grid-cols-[1fr_320px]">
          <div>
            {emailConfigured()
              ? <CodeFlow mode="history" supportPhone={s.business.phone} supportEmail={s.business.email} />
              : <Notice tone="warn"><p className="font-medium">{t('verify.unavailable')}</p><p className="mt-1 text-sm">{t('verify.contact')} <a className="underline" href={`mailto:${s.business.email}`}>{s.business.email}</a> · {s.business.phone}</p></Notice>}
          </div>
          <aside className="card h-fit p-5"><h2 className="font-display text-lg font-semibold">{t('orders.haveLink')}</h2><p className="mt-1 text-sm text-muted">{t('orders.haveLinkText')}</p><Link href={`/${locale}/track`} className="btn-outline mt-4 w-full">{t('nav.track')}</Link></aside>
        </div>
      </>
    );
  }

  const done = (o: (typeof orders)[number]) => ['DELIVERED', 'CANCELLED'].includes(o.fulfillmentStatus);
  const active = orders.filter((o) => !done(o)).sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate));
  const previous = orders.filter(done); // already most-recent first
  const Card = ({ o }: { o: (typeof orders)[number] }) => {
    const first = o.items[0];
    return (
      <li className="card flex gap-4 p-4">
        <Img src={first?.imageUrl} alt="" ratio="1 / 1" className="h-24 w-24 shrink-0 rounded border border-gold-line" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3"><p className="font-display text-lg font-semibold">{o.number}</p><p className="font-semibold">{formatMoney(o.totalCents, locale)}</p></div>
          <p className="truncate text-sm">{first ? (locale === 'fr' ? first.nameFr : first.nameEn) : ''}{o.items.length > 1 ? ` +${o.items.length - 1}` : ''}</p>
          <p className="text-sm text-muted">{t('orders.ordered', { date: formatDateTime(o.createdAt, locale) })} · {t('orders.delivery')}: <span className="capitalize">{formatDate(o.deliveryDate, locale)}</span></p>
          <div className="mt-2 flex flex-wrap items-center gap-2"><StatusBadge kind="p" value={o.paymentStatus} t={t} /><StatusBadge kind="f" value={o.fulfillmentStatus} t={t} />
            <Link href={`/${locale}/my-orders/${o.number}`} className="btn-outline btn-sm ml-auto">{t('orders.view')}</Link></div>
        </div>
      </li>
    );
  };
  return (
    <>
      <PageHeading title={t('orders.title')} sub={t('orders.verifiedAs', { email: session!.email })}><div className="mt-4"><LogoutButton /></div></PageHeading>
      <div className="container-page max-w-4xl space-y-10 py-8">
        {orders.length === 0 && <div className="card p-8 text-center"><p className="font-display text-xl">{t('orders.empty')}</p><Link href={`/${locale}/baskets`} className="btn-emerald mt-4">{t('nav.allBaskets')}</Link></div>}
        {active.length > 0 && <section aria-labelledby="act"><h2 id="act" className="mb-4 font-display text-2xl font-semibold">{t('orders.active')}</h2><ul className="space-y-3">{active.map((o) => <Card key={o.id} o={o} />)}</ul></section>}
        {previous.length > 0 && <section aria-labelledby="prev"><h2 id="prev" className="mb-4 font-display text-2xl font-semibold">{t('orders.previous')}</h2><ul className="space-y-3">{previous.map((o) => <Card key={o.id} o={o} />)}</ul></section>}
      </div>
    </>
  );
}
