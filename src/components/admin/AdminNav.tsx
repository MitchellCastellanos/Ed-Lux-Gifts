'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ClipboardList, Package, Store, Settings, ExternalLink, LogOut, Languages } from 'lucide-react';
import { useI18n } from '@/i18n/client';
import { Monogram } from '../Logo';
import { logoutAction, setAdminLocale } from '@/app/admin/actions';

const ITEMS = [
  { href: '/admin/orders', key: 'a.nav.orders', Icon: ClipboardList },
  { href: '/admin/catalog', key: 'a.nav.catalog', Icon: Package },
  { href: '/admin/storefront', key: 'a.nav.storefront', Icon: Store },
  { href: '/admin/settings', key: 'a.nav.settings', Icon: Settings },
];

export function AdminShell({ children, email, demo }: { children: React.ReactNode; email: string; demo: boolean }) {
  const { t, locale } = useI18n();
  const path = usePathname() ?? '';
  const other = locale === 'fr' ? 'en' : 'fr';
  return (
    <div className="min-h-screen bg-ivory lg:flex">
      <aside className="on-dark fixed inset-y-0 left-0 hidden w-[240px] flex-col bg-emerald-dark text-white lg:flex">
        <div className="flex items-center gap-2 border-b border-white/10 px-5 py-5"><Monogram size={36} /><div><p className="font-display text-[15px] uppercase tracking-[0.14em] text-gold">ED LUX GIFTS</p><p className="text-xs text-white/60">{t('a.adminTitle')}</p></div></div>
        <nav aria-label={t('a.nav.main')} className="flex-1 space-y-1 px-3 py-5">
          {ITEMS.map(({ href, key, Icon }) => {
            const on = path.startsWith(href);
            return <Link key={href} href={href} aria-current={on ? 'page' : undefined} className={`flex min-h-[48px] items-center gap-3 rounded px-4 text-[16px] ${on ? 'bg-white/10 font-semibold text-gold-light' : 'text-white/85 hover:bg-white/5'}`}><Icon size={20} aria-hidden /> {t(key)}</Link>;
          })}
        </nav>
        <div className="space-y-1 border-t border-white/10 px-3 py-4 text-sm">
          <a href={`/${locale}`} target="_blank" rel="noopener" className="flex min-h-[40px] items-center gap-2 rounded px-4 text-white/80 hover:bg-white/5"><ExternalLink size={16} aria-hidden /> {t('a.viewSite')}</a>
          <form action={setAdminLocale.bind(null, other)}><button className="flex min-h-[40px] w-full items-center gap-2 rounded px-4 text-left text-white/80 hover:bg-white/5"><Languages size={16} aria-hidden /> {other === 'fr' ? 'Français' : 'English'}</button></form>
          <form action={logoutAction}><button className="flex min-h-[40px] w-full items-center gap-2 rounded px-4 text-left text-white/80 hover:bg-white/5"><LogOut size={16} aria-hidden /> {t('a.logout')}</button></form>
          <p className="truncate px-4 pt-2 text-xs text-white/50">{email}</p>
        </div>
      </aside>

      <div className="flex-1 lg:pl-[240px]">
        <header className="on-dark sticky top-0 z-30 flex items-center justify-between bg-emerald-dark px-4 py-2.5 text-white lg:hidden">
          <span className="flex items-center gap-2"><Monogram size={30} /><span className="font-display text-sm uppercase tracking-[0.12em] text-gold">{t('a.adminTitle')}</span></span>
          <span className="flex items-center gap-1">
            <form action={setAdminLocale.bind(null, other)}><button className="rounded border border-gold/60 px-2.5 py-1.5 text-xs font-semibold uppercase" aria-label={t('nav.language')}>{other}</button></form>
            <form action={logoutAction}><button className="flex h-10 w-10 items-center justify-center rounded hover:bg-white/10" aria-label={t('a.logout')}><LogOut size={18} aria-hidden /></button></form>
          </span>
        </header>
        {demo && <div className="bg-burgundy px-4 py-1.5 text-center text-[13px] font-medium text-white">{t('a.demoBanner')}</div>}
        <main className="mx-auto w-full max-w-[1200px] px-4 pb-28 pt-6 sm:px-6 lg:pb-12 lg:pt-8">{children}</main>
        <nav aria-label={t('a.nav.main')} className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-gold/40 bg-emerald-dark text-white lg:hidden">
          {ITEMS.map(({ href, key, Icon }) => {
            const on = path.startsWith(href);
            return <Link key={href} href={href} aria-current={on ? 'page' : undefined} className={`flex min-h-[60px] flex-col items-center justify-center gap-0.5 text-[12px] ${on ? 'text-gold-light' : 'text-white/80'}`}><Icon size={22} aria-hidden />{t(key)}</Link>;
          })}
        </nav>
      </div>
    </div>
  );
}

export function PageTitle({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div><h1 className="font-display text-[28px] font-semibold leading-tight sm:text-[34px]">{title}</h1>{sub && <p className="mt-1 max-w-2xl text-muted">{sub}</p>}</div>
      {children && <div className="flex flex-wrap gap-3">{children}</div>}
    </div>
  );
}
