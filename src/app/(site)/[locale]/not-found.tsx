import Link from 'next/link';
import { currentLocale } from '@/i18n/server';
import { makeT } from '@/i18n';

export default async function NotFound() {
  const locale = await currentLocale();
  const t = makeT(locale);
  return (
    <div className="container-page py-20 text-center">
      <p className="font-script text-6xl text-gold-deep">404</p>
      <h1 className="mt-2 font-display text-3xl font-semibold">{t('notFound.title')}</h1>
      <p className="mt-2 text-muted">{t('notFound.text')}</p>
      <Link href={`/${locale}`} className="btn-emerald mt-6">{t('nav.home')}</Link>
    </div>
  );
}
