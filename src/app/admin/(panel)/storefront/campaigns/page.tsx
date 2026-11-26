import Link from 'next/link';
import { Plus } from 'lucide-react';
import { getT } from '@/i18n/server';
import { getSettings } from '@/lib/settings';
import { prisma } from '@/lib/db';
import { loc } from '@/lib/i18n-labels';
import { formatDateTime } from '@/lib/schedule';
import { Flash } from '@/components/admin/ui';
import { Img } from '@/components/ui';
import { campaignState } from '../../../actions';

export default async function CampaignsList({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const sp = await searchParams;
  const { t, locale } = await getT();
  const now = new Date();
  const list = await prisma.campaign.findMany({ orderBy: [{ published: 'desc' }, { createdAt: 'desc' }] });
  void getSettings;
  const live = (c: (typeof list)[number]) => c.published && (!c.startsAt || c.startsAt <= now) && (!c.endsAt || c.endsAt >= now);
  return (
    <>
      <Flash ok={sp.ok} />
      <div className="mb-4 flex items-center justify-between gap-3"><p className="max-w-xl text-muted">{t('a.campaigns.help')}</p><Link href="/admin/storefront/campaigns/new" className="btn-emerald shrink-0"><Plus size={18} aria-hidden /> {t('a.campaigns.add')}</Link></div>
      {!list.some(live) && <p className="mb-4 rounded bg-champagne/70 px-3 py-2 text-sm">{t('a.campaigns.noneLive')}</p>}
      <ul className="space-y-3">
        {list.map((c) => (
          <li key={c.id} className="flex flex-wrap gap-4 rounded-lg border border-gold-line bg-white p-3">
            <Img src={c.desktopImage} alt="" ratio="12 / 5" className="w-48 shrink-0 self-start rounded" />
            <div className="min-w-0 flex-1"><Link href={`/admin/storefront/campaigns/${c.id}`} className="font-display text-lg font-semibold text-emerald hover:underline">{c.name}</Link>
              <p className="text-sm text-muted">{loc(c, 'headline', locale).replaceAll('*', '')}</p>
              <p className="mt-1 flex flex-wrap gap-2"><span className={`badge ${live(c) ? 'border-emerald/40 bg-emerald-soft text-emerald' : c.published ? 'border-amber-400 bg-amber-50 text-amber-900' : 'border-neutral-400 bg-neutral-100'}`}>{live(c) ? t('a.campaigns.live') : c.published ? t('a.campaigns.scheduled') : t('a.campaigns.draft')}</span>
                {(c.startsAt || c.endsAt) && <span className="text-xs text-muted">{c.startsAt ? formatDateTime(c.startsAt, locale) : '…'} → {c.endsAt ? formatDateTime(c.endsAt, locale) : '…'}</span>}</p>
              <div className="mt-2 flex flex-wrap gap-2"><Link href={`/admin/storefront/campaigns/${c.id}`} className="btn-outline btn-sm">{t('a.edit')}</Link>
                <form action={campaignState}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="op" value={c.published ? 'unpublish' : 'publish'} /><button className="btn-ghost btn-sm">{c.published ? t('a.campaigns.unpublish') : t('a.campaigns.publish')}</button></form></div></div>
          </li>
        ))}
      </ul>
    </>
  );
}
