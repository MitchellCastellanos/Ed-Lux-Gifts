import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isLocale, makeT } from '@/i18n';
import { PageHeading } from '@/components/ui';
import { CodeFlow } from '@/components/CodeFlow';
import { getSettings } from '@/lib/settings';
import { pageMeta } from '@/lib/seo';
import { emailConfigured } from '@/lib/email';
import { Notice } from '@/components/ui';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return pageMeta({ locale, path: '/track', title: makeT(locale)('track.title'), noindex: true });
}

export default async function TrackPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = makeT(locale);
  const s = await getSettings();
  return (
    <>
      <PageHeading title={t('track.title')} sub={t('track.sub')} />
      <div className="container-page grid max-w-5xl gap-6 py-8 md:grid-cols-[1fr_320px]">
        <div>
          {emailConfigured() ? <CodeFlow mode="order" supportPhone={s.business.phone} supportEmail={s.business.email} /> : <Notice tone="warn">{t('verify.unavailable')} <a className="underline" href={`mailto:${s.business.email}`}>{s.business.email}</a> · {s.business.phone}</Notice>}
        </div>
        <aside className="card h-fit p-5"><h2 className="font-display text-lg font-semibold">{t('track.linkTitle')}</h2><p className="mt-1 text-sm text-muted">{t('track.linkText')}</p>
          <Link href={`/${locale}/my-orders`} className="btn-outline mt-4 w-full">{t('nav.myOrders')}</Link></aside>
      </div>
    </>
  );
}
