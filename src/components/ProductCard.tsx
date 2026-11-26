import Link from 'next/link';
import { Img } from './ui';
import { formatMoney, type Locale } from '@/lib/money';
import { loc } from '@/lib/i18n-labels';
import { productStock, type ProductFull } from '@/lib/catalog';
import type { TFn } from '@/i18n';

export function ProductCard({ p, locale, t }: { p: ProductFull; locale: Locale; t: TFn }) {
  const stock = productStock(p);
  const name = loc(p, 'name', locale);
  return (
    <article className="group flex flex-col overflow-hidden rounded-lg border border-gold-line/80 bg-white">
      <Link href={`/${locale}/baskets/${p.slug}`} className="block" aria-label={name}>
        <Img src={p.images[0]?.url} alt={loc(p.images[0] ?? { altFr: name, altEn: name }, 'alt', locale) || name} ratio="4 / 5" className="transition-transform duration-500 group-hover:scale-[1.02]" />
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-display text-[19px] font-semibold leading-snug"><Link href={`/${locale}/baskets/${p.slug}`}>{name}</Link></h3>
        <div className="mt-1 flex items-center justify-between gap-2">
          <span className="text-[18px] font-semibold text-emerald">{formatMoney(p.priceCents, locale)}</span>
          <span className={`text-sm font-medium ${stock === 0 ? 'text-danger' : stock <= 3 ? 'text-amber-800' : 'text-emerald-mid'}`}>
            {stock === 0 ? t('product.soldOut') : stock <= 3 ? t('product.fewLeft', { n: stock }) : t('product.inStock')}
          </span>
        </div>
        <Link href={`/${locale}/baskets/${p.slug}`} className={`mt-4 ${stock === 0 ? 'btn-outline' : 'btn-emerald'} w-full`}>{stock === 0 ? t('product.details') : t('product.view')}</Link>
      </div>
    </article>
  );
}
