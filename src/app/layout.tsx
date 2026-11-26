import './globals.css';
import type { Metadata, Viewport } from 'next';
import { currentLocale } from '@/i18n/server';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: { default: 'ED LUX GIFTS', template: '%s | ED LUX GIFTS' },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#06271E' };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await currentLocale();
  return (
    <html lang={locale === 'fr' ? 'fr-CA' : 'en-CA'}>
      <body>{children}</body>
    </html>
  );
}
