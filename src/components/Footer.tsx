import Link from 'next/link';
import { Phone, Mail, MapPin, Instagram, Facebook, ShieldCheck } from 'lucide-react';
import { Logo } from './Logo';
import { getSettings } from '@/lib/settings';
import { visibleCollections } from '@/lib/catalog';
import { loc } from '@/lib/i18n-labels';
import { makeT } from '@/i18n';
import type { Locale } from '@/lib/money';

export async function Footer({ locale }: { locale: Locale }) {
  const t = makeT(locale);
  const [s, cols] = await Promise.all([getSettings(), visibleCollections()]);
  const b = s.business;
  const base = `/${locale}`;
  return (
    <footer className="on-dark mt-16 bg-emerald-dark text-white/90">
      <div className="container-page grid gap-10 py-12 md:grid-cols-4">
        <div className="md:col-span-1">
          <Logo compact />
          <p className="mt-4 text-sm leading-relaxed text-white/75">{locale === 'fr' ? b.aboutFr : b.aboutEn}</p>
        </div>
        <nav aria-label={t('footer.shop')}>
          <h2 className="font-display text-lg text-gold-light">{t('footer.shop')}</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link className="hover:text-gold-light" href={`${base}/baskets`}>{t('nav.allBaskets')}</Link></li>
            {cols.map((c) => <li key={c.id}><Link className="hover:text-gold-light" href={`${base}/collections/${c.slug}`}>{loc(c, 'name', locale)}</Link></li>)}
            <li><Link className="hover:text-gold-light" href={`${base}/build`}>{t('nav.build')}</Link></li>
            <li><Link className="hover:text-gold-light" href={`${base}/delivery`}>{t('nav.delivery')}</Link></li>
          </ul>
        </nav>
        <nav aria-label={t('footer.help')}>
          <h2 className="font-display text-lg text-gold-light">{t('footer.help')}</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link className="hover:text-gold-light" href={`${base}/track`}>{t('nav.track')}</Link></li>
            <li><Link className="hover:text-gold-light" href={`${base}/my-orders`}>{t('nav.myOrders')}</Link></li>
            <li><Link className="hover:text-gold-light" href={`${base}/about`}>{t('nav.about')}</Link></li>
            <li><Link className="hover:text-gold-light" href={`${base}/privacy`}>{t('footer.privacy')}</Link></li>
            <li><Link className="hover:text-gold-light" href={`${base}/terms`}>{t('footer.terms')}</Link></li>
          </ul>
        </nav>
        <div>
          <h2 className="font-display text-lg text-gold-light">{t('footer.contact')}</h2>
          <ul className="mt-3 space-y-2.5 text-sm">
            {b.phone && <li><a className="flex items-center gap-2 hover:text-gold-light" href={`tel:${b.phone.replace(/[^\d+]/g, '')}`}><Phone size={16} aria-hidden /> {b.phone}</a></li>}
            {b.email && <li><a className="flex items-center gap-2 hover:text-gold-light" href={`mailto:${b.email}`}><Mail size={16} aria-hidden /> {b.email}</a></li>}
            <li className="flex items-center gap-2"><MapPin size={16} aria-hidden /> {b.city}</li>
            {b.instagram && <li><a className="flex items-center gap-2 hover:text-gold-light" href={b.instagram} rel="noopener noreferrer"><Instagram size={16} aria-hidden /> Instagram</a></li>}
            {b.facebook && <li><a className="flex items-center gap-2 hover:text-gold-light" href={b.facebook} rel="noopener noreferrer"><Facebook size={16} aria-hidden /> Facebook</a></li>}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-xs text-white/60">
        <div className="container-page flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} {b.name} · {t('footer.rights')}</p>
          <Link href="/admin" rel="nofollow" className="inline-flex min-h-[36px] items-center gap-1.5 rounded border border-white/30 px-3.5 text-[13px] font-medium text-white/85 hover:border-gold hover:text-gold-light">
            <ShieldCheck size={14} aria-hidden /> {t('footer.staff')}
          </Link>
        </div>
      </div>
    </footer>
  );
}
