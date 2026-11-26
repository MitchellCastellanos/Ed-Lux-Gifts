import { notFound } from 'next/navigation';
import { isLocale } from '@/i18n';
import { I18nProvider } from '@/i18n/client';
import { CartProvider } from '@/components/CartProvider';
import { SiteHeader } from '@/components/SiteHeader';
import { Footer } from '@/components/Footer';
import { getSettings } from '@/lib/settings';
import { makeT } from '@/i18n';

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = makeT(locale);
  const s = await getSettings();
  return (
    <I18nProvider locale={locale}>
      <CartProvider>
        <a href="#main" className="sr-only z-50 bg-white p-3 focus:not-sr-only focus:absolute">{t('nav.skip')}</a>
        {s.store.mode === 'demo' && (
          <div className="bg-burgundy px-4 py-1.5 text-center text-[13px] font-medium text-white">{t('demo.banner')}</div>
        )}
        <SiteHeader locale={locale} />
        <main id="main">{children}</main>
        <Footer locale={locale} />
      </CartProvider>
    </I18nProvider>
  );
}
