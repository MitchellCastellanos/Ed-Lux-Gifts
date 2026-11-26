import Link from 'next/link';
import { CalendarDays, Truck, MapPin, CreditCard, ShoppingBasket, CalendarCheck, PackageCheck } from 'lucide-react';
import { notFound } from 'next/navigation';
import { isLocale, makeT } from '@/i18n';
import { activeCampaigns, activeProducts, visibleCollections } from '@/lib/catalog';
import { getSettings } from '@/lib/settings';
import { loc } from '@/lib/i18n-labels';
import { weekdayName } from '@/lib/schedule';
import { formatTime, pageMeta, siteUrl } from '@/lib/seo';
import { formatMoney } from '@/lib/money';
import { prisma } from '@/lib/db';
import { HeroCarousel } from '@/components/Hero';
import { HeroSlide, type SlideData } from '@/components/HeroSlide';
import { ProductCard } from '@/components/ProductCard';
import { Img, SectionTitle, ArrowLink } from '@/components/ui';
import { expireReservations } from '@/lib/orders';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = makeT(locale);
  return pageMeta({ locale, path: '/', title: t('home.metaTitle'), description: t('home.metaDesc') });
}

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = makeT(locale);
  void expireReservations().catch(() => {});
  const [campaigns, settings, cols, zones] = await Promise.all([activeCampaigns(), getSettings(), visibleCollections(), prisma.deliveryZone.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } })]);
  const base = `/${locale}`;
  const sc = settings.schedule;

  const slides: SlideData[] = campaigns.length
    ? campaigns.map((c) => ({
        eyebrow: loc(c, 'eyebrow', locale), headline: loc(c, 'headline', locale), description: loc(c, 'desc', locale), cta: loc(c, 'cta', locale) || t('nav.allBaskets'),
        href: c.collection ? `${base}/collections/${c.collection.slug}` : `${base}/baskets`, desktop: c.desktopImage, mobile: c.mobileImage ?? c.desktopImage, accent: c.accent, alt: loc(c, 'headline', locale).replaceAll('*', ''),
      }))
    : [{ eyebrow: t('home.evergreen.eyebrow'), headline: t('home.evergreen.headline'), description: t('home.evergreen.desc'), cta: t('home.evergreen.cta'), href: `${base}/baskets`, desktop: '/images/hero/hero-evergreen-desktop.jpg', mobile: '/images/hero/hero-evergreen-mobile.jpg', accent: 'gold', alt: t('home.evergreen.headline') }];

  const collection = campaigns.find((c) => c.collection)?.collection ?? cols[0] ?? null;
  let featured = await activeProducts({ featured: true, collectionSlug: collection?.slug, take: 4 });
  if (featured.length === 0) featured = await activeProducts({ collectionSlug: collection?.slug, take: 4 });
  const heading = collection ? loc(collection, 'name', locale) : t('home.ourBaskets');
  const tagline = campaigns.find((c) => loc(c, 'tagline', locale))?.[locale === 'fr' ? 'taglineFr' : 'taglineEn'] ?? t('home.evergreen.tagline');

  const days = sc.deliveryDays.slice().sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
  const pay = settings.payments;
  const payText = pay.interacEnabled && pay.codEnabled ? t('strip.payBoth') : pay.interacEnabled ? t('strip.payInterac') : t('strip.payCod');
  const strip = [
    { icon: CalendarDays, a: t('strip.cutoffA'), b: t('strip.cutoffB', { day: weekdayName(sc.cutoffDay, locale), time: formatTime(sc.cutoffTime, locale) }) },
    { icon: Truck, a: t('strip.deliveryA', { days: days.map((d) => weekdayName(d, locale)).join(locale === 'fr' ? ' et ' : ' & ') }), b: t('strip.deliveryB') },
    { icon: MapPin, a: settings.business.city.split(',')[0], b: t('strip.areaB') },
    { icon: CreditCard, a: t('strip.payA'), b: payText },
  ];

  return (
    <>
      <HeroCarousel>{slides.map((s, i) => <HeroSlide key={i} s={s} eager={i === 0} />)}</HeroCarousel>

      <section aria-label={t('strip.aria')} className="border-b border-gold-line/70 bg-ivory shadow-[0_2px_8px_rgba(6,39,30,0.05)]">
        <ul className="container-page grid grid-cols-1 gap-x-6 gap-y-3 py-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-y-0">
          {strip.map(({ icon: I, a, b }, i) => (
            <li key={i} className={`flex items-center gap-3.5 lg:px-4 ${i > 0 ? 'lg:border-l lg:border-gold-line' : ''}`}>
              <I size={34} strokeWidth={1.3} className="shrink-0 text-gold-deep" aria-hidden />
              <p className="text-[15px] leading-snug"><span className="block font-semibold text-emerald-dark">{a}</span><span className="text-ink/85">{b}</span></p>
            </li>
          ))}
        </ul>
      </section>

      <section className="container-page pt-12 sm:pt-14">
        <SectionTitle>{heading}</SectionTitle>
        <div className="grid gap-5 md:grid-cols-2">
          {[
            { img: '/images/cards/path-ready-made.jpg', title: t('home.pathA.title'), text: t('home.pathA.text'), cta: t('home.pathA.cta'), href: collection ? `${base}/collections/${collection.slug}` : `${base}/baskets` },
            { img: '/images/cards/path-custom.jpg', title: t('home.pathB.title'), text: t('home.pathB.text'), cta: t('home.pathB.cta'), href: `${base}/build` },
          ].map((c) => (
            <article key={c.title} className="flex overflow-hidden rounded-lg border border-gold-line bg-gradient-to-br from-white to-champagne/70 shadow-sm">
              <Img src={c.img} alt="" className="w-[42%] shrink-0 sm:w-[46%]" ratio="4 / 5" />
              <div className="flex flex-1 flex-col justify-center p-5 sm:p-7">
                <h3 className="font-display text-[26px] font-semibold leading-tight sm:text-[32px]">{c.title}</h3>
                <p className="mt-2 text-[16px] leading-snug text-ink/85">{c.text}</p>
                <div className="mt-5"><ArrowLink href={c.href}>{c.cta}</ArrowLink></div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {featured.length > 0 && (
        <section className="container-page pt-14">
          <div className="mb-6 flex items-end justify-between gap-4">
            <h2 className="font-display text-[26px] font-semibold sm:text-[30px]">{t('home.featured')}</h2>
            <Link href={collection ? `${base}/collections/${collection.slug}` : `${base}/baskets`} className="text-sm font-medium text-emerald underline underline-offset-4">{t('home.seeAll')}</Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">{featured.map((p) => <ProductCard key={p.id} p={p} locale={locale} t={t} />)}</div>
        </section>
      )}

      <section className="container-page pt-16" aria-labelledby="how">
        <SectionTitle>{<span id="how">{t('home.how.title')}</span>}</SectionTitle>
        <ol className="grid gap-5 md:grid-cols-3">
          {[[ShoppingBasket, 'home.how.1'], [CalendarCheck, 'home.how.2'], [PackageCheck, 'home.how.3']].map(([I, k], i) => {
            const Icon = I as typeof ShoppingBasket;
            return (
              <li key={i} className="card p-6 text-center">
                <Icon size={30} strokeWidth={1.4} className="mx-auto text-gold-deep" aria-hidden />
                <h3 className="mt-3 font-display text-xl font-semibold">{t(`${k}.t`)}</h3>
                <p className="mt-1.5 text-[15px] text-muted">{t(`${k}.d`)}</p>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="container-page grid gap-8 pt-16 md:grid-cols-2">
        <div>
          <h2 className="font-display text-[26px] font-semibold">{t('home.coverage.title')}</h2>
          <p className="mt-2 text-muted">{t('home.coverage.text')}</p>
          <ul className="mt-4 divide-y divide-gold-line/70 rounded-lg border border-gold-line bg-white">
            {zones.map((z) => (
              <li key={z.id} className="flex items-baseline justify-between gap-3 px-4 py-3">
                <span><span className="font-medium">{z.name}</span><span className="block text-sm text-muted">{z.areas}</span></span>
                <span className="shrink-0 font-semibold text-emerald">{formatMoney(z.feeCents, locale)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm"><Link href={`${base}/delivery`} className="font-medium text-emerald underline underline-offset-4">{t('home.coverage.more')}</Link></p>
        </div>
        <div className="rounded-lg bg-emerald p-7 text-white">
          <h2 className="font-display text-[26px] font-semibold !text-white">{t('home.about.title')}</h2>
          <p className="mt-3 leading-relaxed text-white/90">{locale === 'fr' ? settings.business.aboutFr : settings.business.aboutEn}</p>
          <div className="mt-5 text-sm text-white/85">
            <p>{settings.business.phone} · {settings.business.email}</p>
            <p className="mt-1">{settings.business.city}</p>
          </div>
          <Link href={`${base}/about`} className="btn-gold mt-5">{t('home.about.cta')}</Link>
        </div>
      </section>

      <div className="on-dark mt-16 bg-emerald-dark py-7 text-center">
        <p className="mx-auto flex max-w-page items-center gap-4 px-4 font-display text-[15px] uppercase tracking-[0.3em] text-gold-light sm:gap-8 sm:text-[20px]"><span className="h-px flex-1 bg-gold/50" /> <span className="text-balance">{tagline}</span> <span className="h-px flex-1 bg-gold/50" /></p>
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebSite', name: 'ED LUX GIFTS', url: siteUrl() }) }} />
    </>
  );
}
