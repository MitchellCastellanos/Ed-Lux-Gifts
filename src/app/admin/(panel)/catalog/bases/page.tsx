import Link from 'next/link';
import { Plus } from 'lucide-react';
import { getT } from '@/i18n/server';
import { prisma } from '@/lib/db';
import { available } from '@/lib/catalog';
import { loc } from '@/lib/i18n-labels';
import { formatMoney } from '@/lib/money';
import { Flash } from '@/components/admin/ui';
import { Img } from '@/components/ui';

export default async function BasesList({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const sp = await searchParams;
  const { t, locale } = await getT();
  const bases = await prisma.component.findMany({ where: { kind: 'BASE' }, orderBy: [{ archived: 'asc' }, { sortOrder: 'asc' }] });
  return (
    <>
      <Flash ok={sp.ok} />
      <div className="mb-4 flex justify-end"><Link href="/admin/catalog/bases/new" className="btn-emerald"><Plus size={18} aria-hidden /> {t('a.bases.add')}</Link></div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {bases.map((b) => (
          <li key={b.id} className={`flex gap-3 rounded-lg border border-gold-line bg-white p-3 ${b.archived ? 'opacity-60' : ''}`}>
            <Img src={b.imageUrl} alt="" ratio="1 / 1" className="h-24 w-24 shrink-0 rounded" />
            <div><Link href={`/admin/catalog/bases/${b.id}`} className="font-display text-lg font-semibold text-emerald hover:underline">{loc(b, 'name', locale)}</Link>
              <p className="font-semibold">{formatMoney(b.priceCents, locale)}</p><p className="text-sm text-muted">{t('a.bases.capacity', { n: b.capacity })} · {t('a.stock.avail', { n: available(b) })}</p></div>
          </li>
        ))}
      </ul>
    </>
  );
}
