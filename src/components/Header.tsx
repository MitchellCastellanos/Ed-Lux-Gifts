'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { Search, ShoppingBag, ChevronDown, Menu, X, PackageSearch } from 'lucide-react';
import { Logo } from './Logo';
import { useCart } from './CartProvider';
import { useI18n } from '@/i18n/client';

type Col = { slug: string; name: string };

export function Header({ collections }: { collections: Col[] }) {
  const { t, locale } = useI18n();
  const path = usePathname() ?? '';
  const { count } = useCart();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const base = `/${locale}`;
  const rest = path.replace(/^\/(fr|en)/, '') || '/';

  useEffect(() => { setOpen(false); setMenu(false); setSearch(false); }, [path]);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const active = (p: string) => (p === '/' ? rest === '/' : rest.startsWith(p));
  const link = (p: string, label: string, extra = '') => (
    <Link href={`${base}${p === '/' ? '' : p}`} aria-current={active(p) ? 'page' : undefined}
      className={`relative whitespace-nowrap py-2 text-[16px] text-white/90 transition-colors hover:text-gold-light ${active(p) ? 'text-white after:absolute after:inset-x-0 after:-bottom-0.5 after:h-[2px] after:bg-gold' : ''} ${extra}`}>
      {label}
    </Link>
  );

  const LangSwitch = (
    <div role="group" aria-label={t('nav.language')} className="flex overflow-hidden rounded border border-gold/70 text-sm font-semibold">
      {(['fr', 'en'] as const).map((l) => (
        <Link key={l} href={l === locale ? '#' : `/${l}${rest === '/' ? '' : rest}`} hrefLang={l} lang={l} aria-current={l === locale ? 'true' : undefined} onClick={(e) => l === locale && e.preventDefault()}
          className={`px-3 py-1.5 uppercase ${l === locale ? 'bg-gold text-emerald-dark' : 'text-white hover:bg-white/10'}`}>{l}</Link>
      ))}
    </div>
  );

  return (
    <header className="on-dark sticky top-0 z-40 border-b border-gold/40 bg-emerald-dark text-white">
      <div className="container-page flex h-[68px] items-center justify-between gap-2 sm:gap-4 lg:h-[80px]">
        <Link href={base} aria-label="ED LUX GIFTS" className="shrink-0"><Logo /></Link>

        <nav aria-label={t('nav.main')} className="hidden items-center gap-7 lg:flex xl:gap-9">
          {link('/', t('nav.home'))}
          <div className="relative" ref={menuRef}>
            <button type="button" aria-expanded={menu} aria-haspopup="true" onClick={() => setMenu(!menu)}
              className={`flex items-center gap-1 whitespace-nowrap py-2 text-[16px] hover:text-gold-light ${active('/baskets') || active('/collections') ? 'text-white' : 'text-white/90'}`}>
              {t('nav.baskets')} <ChevronDown size={15} aria-hidden />
            </button>
            {menu && (
              <div className="absolute left-0 top-full z-50 mt-2 min-w-[240px] rounded border border-gold/40 bg-emerald-dark py-2 shadow-lg">
                <Link href={`${base}/baskets`} className="block px-4 py-2.5 hover:bg-white/10">{t('nav.allBaskets')}</Link>
                {collections.map((c) => (<Link key={c.slug} href={`${base}/collections/${c.slug}`} className="block px-4 py-2.5 hover:bg-white/10">{c.name}</Link>))}
              </div>
            )}
          </div>
          {link('/build', t('nav.build'))}
          {link('/delivery', t('nav.delivery'))}
          {link('/about', t('nav.about'))}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-3">
          <Link href={`${base}/my-orders`} className="hidden items-center gap-1.5 whitespace-nowrap rounded px-2 py-2 text-sm text-white/90 hover:text-gold-light lg:flex" title={t('nav.myOrders')}>
            <PackageSearch size={20} aria-hidden /> <span className="hidden xl:inline">{t('nav.myOrders')}</span><span className="sr-only xl:hidden">{t('nav.myOrders')}</span>
          </Link>
          <button type="button" onClick={() => setSearch(!search)} aria-label={t('nav.search')} aria-expanded={search} className="hidden h-11 w-11 items-center justify-center rounded hover:bg-white/10 sm:flex"><Search size={22} aria-hidden /></button>
          <Link href={`${base}/cart`} aria-label={`${t('nav.cart')} (${count})`} className="relative flex h-10 w-10 items-center justify-center rounded hover:bg-white/10 sm:h-11 sm:w-11">
            <ShoppingBag size={23} aria-hidden />
            <span aria-hidden className="absolute right-0.5 top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold leading-none text-white">{count}</span>
          </Link>
          <div className="hidden sm:block">{LangSwitch}</div>
          <button type="button" className="flex h-10 w-10 items-center justify-center rounded hover:bg-white/10 sm:h-11 sm:w-11 lg:hidden" aria-label={open ? t('nav.close') : t('nav.menu')} aria-expanded={open} onClick={() => setOpen(!open)}>
            {open ? <X size={24} aria-hidden /> : <Menu size={24} aria-hidden />}
          </button>
        </div>
      </div>

      {search && (
        <form action={`${base}/baskets`} role="search" className="border-t border-gold/30 bg-emerald">
          <div className="container-page flex gap-2 py-3">
            <input name="q" autoFocus type="search" placeholder={t('nav.searchPlaceholder')} aria-label={t('nav.search')} className="input !border-gold/40 text-ink" />
            <button className="btn-gold" type="submit">{t('nav.search')}</button>
          </div>
        </form>
      )}

      {open && (
        <div className="border-t border-gold/30 bg-emerald-dark lg:hidden">
          <nav aria-label={t('nav.main')} className="container-page flex flex-col py-2 text-[17px]">
            {[['/', t('nav.home')], ['/baskets', t('nav.allBaskets')], ...collections.map((c) => [`/collections/${c.slug}`, c.name]), ['/build', t('nav.build')], ['/delivery', t('nav.delivery')], ['/about', t('nav.about')]].map(([p, l]) => (
              <Link key={p} href={`${base}${p === '/' ? '' : p}`} className={`border-b border-white/10 py-3.5 ${active(p) ? 'text-gold-light' : ''}`}>{l}</Link>
            ))}
            <Link href={`${base}/my-orders`} className="flex items-center gap-2 border-b border-white/10 py-3.5 font-medium text-gold-light"><PackageSearch size={20} aria-hidden /> {t('nav.myOrders')}</Link>
            <form action={`${base}/baskets`} role="search" className="flex gap-2 py-3 sm:hidden"><input name="q" type="search" placeholder={t('nav.searchPlaceholder')} aria-label={t('nav.search')} className="input" /><button className="btn-gold" type="submit"><Search size={18} aria-hidden /><span className="sr-only">{t('nav.search')}</span></button></form>
            <div className="py-3 sm:hidden">{LangSwitch}</div>
          </nav>
        </div>
      )}
    </header>
  );
}
