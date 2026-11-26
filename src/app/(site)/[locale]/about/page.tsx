import { notFound } from 'next/navigation';
import { Phone, Mail, MapPin, Clock } from 'lucide-react';
import { isLocale, makeT } from '@/i18n';
import { getSettings } from '@/lib/settings';
import { pageMeta, siteUrl } from '@/lib/seo';
import { PageHeading } from '@/components/ui';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return pageMeta({ locale, path: '/about', title: makeT(locale)('about.title') });
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = makeT(locale);
  const { business: b, store } = await getSettings();
  // LocalBusiness data is published only after the owner confirms real business details.
  const ld = b.verified && store.mode === 'live' ? { '@context': 'https://schema.org', '@type': 'Store', name: b.name, telephone: b.phone, email: b.email, url: siteUrl(), address: { '@type': 'PostalAddress', addressLocality: b.city, addressCountry: 'CA' } } : null;
  return (
    <>
      <PageHeading title={t('about.title')} />
      <div className="container-page grid max-w-5xl gap-8 py-8 md:grid-cols-2">
        <div><h2 className="font-display text-2xl font-semibold">{t('about.story')}</h2><p className="mt-3 leading-relaxed">{locale === 'fr' ? b.aboutFr : b.aboutEn}</p></div>
        <div className="card space-y-3 p-6"><h2 className="font-display text-2xl font-semibold">{t('footer.contact')}</h2>
          <p className="flex items-center gap-2"><Phone size={18} className="text-gold-deep" aria-hidden /><a className="underline" href={`tel:${b.phone.replace(/[^\d+]/g, '')}`}>{b.phone}</a></p>
          <p className="flex items-center gap-2"><Mail size={18} className="text-gold-deep" aria-hidden /><a className="underline" href={`mailto:${b.email}`}>{b.email}</a></p>
          <p className="flex items-center gap-2"><MapPin size={18} className="text-gold-deep" aria-hidden />{b.addressLine ? `${b.addressLine}, ` : ''}{b.city}</p>
          <p className="flex items-center gap-2"><Clock size={18} className="text-gold-deep" aria-hidden />{locale === 'fr' ? b.hoursFr : b.hoursEn}</p>
          <p className="pt-2 text-sm text-muted">{t('about.pickupNote')}</p></div>
      </div>
      {ld && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />}
    </>
  );
}
