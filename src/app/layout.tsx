import './globals.css';
import type { Metadata, Viewport } from 'next';
import { currentLocale } from '@/i18n/server';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: { default: 'ED LUX GIFTS', template: '%s | ED LUX GIFTS' },
  applicationName: 'ED LUX GIFTS',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-48x48.png', sizes: '48x48', type: 'image/png' },
      { url: '/favicon-64x64.png', sizes: '64x64', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: { siteName: 'ED LUX GIFTS', images: [{ url: '/images/og/og-default.jpg', width: 1200, height: 630, alt: 'ED LUX GIFTS' }] },
  twitter: { card: 'summary_large_image', images: ['/images/og/og-default.jpg'] },
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
