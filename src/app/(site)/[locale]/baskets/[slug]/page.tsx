import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isLocale, makeT } from '@/i18n';
import { prisma } from '@/lib/db';
import { productInclude, productStock } from '@/lib/catalog';
import { loc } from '@/lib/i18n-labels';
import { formatMoney } from '@/lib/money';
import { pageMeta, siteUrl } from '@/lib/seo';
import { Img } from '@/components/ui';
import { AddToCart } from '@/components/AddToCart';
import { Check } from 'lucide-react';

async function getP(slug: string) {
  const p = await prisma.product.findUnique({ where: { slug }, include: productInclude });
  return p && p.active && !p.archived ? p : null;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const p = await getP(slug);
  if (!p) return {};
  return pageMeta({ locale, path: `/baskets/${slug}`, title: loc(p, 'name', locale), description: loc(p, 'desc', locale).slice(0, 160), image: p.images[0]?.url });
}

export default async function ProductPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const t = makeT(locale);
  const p = await getP(slug);
  if (!p) notFound();
  const stock = productStock(p);
  const name = loc(p, 'name', locale);
  const base = p.recipe.find((r) => r.component.kind === 'BASE');
  const contents = p.recipe.filter((r) => r.component.kind !== 'BASE');
  const ld = { '@context': 'https://schema.org', '@type': 'Product', name, description: loc(p, 'desc', locale), image: p.images.map((i) => `${siteUrl()}${i.url}`), offers: { '@type': 'Offer', priceCurrency: 'CAD', price: (p.priceCents / 100).toFixed(2), availability: stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock', url: `${siteUrl()}/${locale}/baskets/${slug}` } };
  return (
    <div className="container-page py-8 sm:py-12">
      <nav aria-label="breadcrumb" className="mb-5 text-sm text-muted"><Link href={`/${locale}/baskets`} className="underline underline-offset-4">{t('catalog.title')}</Link> / <span>{name}</span></nav>
      <div className="grid gap-8 md:grid-cols-2 lg:gap-14">
        <div className="space-y-3">
          <Img src={p.images[0]?.url} alt={name} ratio="4 / 5" eager className="rounded-lg border border-gold-line" />
          {p.images.length > 1 && <div className="grid grid-cols-4 gap-2">{p.images.slice(1).map((i) => <Img key={i.id} src={i.url} alt={loc(i, 'alt', locale) || name} ratio="1 / 1" className="rounded border border-gold-line" />)}</div>}
        </div>
        <div>
          <h1 className="font-display text-[34px] font-semibold leading-tight sm:text-[42px]">{name}</h1>
          <p className="mt-2 text-[26px] font-semibold text-emerald">{formatMoney(p.priceCents, locale)}</p>
          <p className={`mt-1 text-sm font-medium ${stock === 0 ? 'text-danger' : stock <= 3 ? 'text-amber-800' : 'text-emerald-mid'}`}>{stock === 0 ? t('product.soldOut') : stock <= 3 ? t('product.fewLeft', { n: stock }) : t('product.inStock')}</p>
          <p className="mt-5 leading-relaxed text-ink/90">{loc(p, 'desc', locale)}</p>
          <h2 className="mt-7 font-display text-xl font-semibold">{t('product.included')}</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {contents.map((r) => (
              <li key={r.componentId} className="flex items-start gap-2 text-[15px]"><Check size={17} className="mt-0.5 shrink-0 text-gold-deep" aria-hidden /><span>{r.quantity > 1 ? `${r.quantity} × ` : ''}{loc(r.component, 'name', locale)}</span></li>
            ))}
          </ul>
          {base && <p className="mt-3 text-sm text-muted">{t('product.presentedIn', { base: loc(base.component, 'name', locale) })}</p>}
          <div className="mt-8 border-t border-gold-line pt-6"><AddToCart productId={p.id} stock={stock} priceCents={p.priceCents} /></div>
          <p className="mt-5 text-sm text-muted">{t('product.priceNote')}</p>
          <p className="mt-2 text-sm"><Link href={`/${locale}/build`} className="font-medium text-emerald underline underline-offset-4">{t('product.orBuild')}</Link></p>
        </div>
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
    </div>
  );
}
