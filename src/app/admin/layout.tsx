import { currentLocale } from '@/i18n/server';
import { I18nProvider } from '@/i18n/client';

export const metadata = { title: 'Admin', robots: { index: false, follow: false } };

export default async function AdminRoot({ children }: { children: React.ReactNode }) {
  const locale = await currentLocale();
  return <I18nProvider locale={locale}>{children}</I18nProvider>;
}
