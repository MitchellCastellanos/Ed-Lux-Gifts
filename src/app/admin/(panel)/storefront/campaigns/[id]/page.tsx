import { notFound } from 'next/navigation';
import { getT } from '@/i18n/server';
import { prisma } from '@/lib/db';
import { loc } from '@/lib/i18n-labels';
import { Flash, ConfirmButton } from '@/components/admin/ui';
import { CampaignForm } from '../CampaignForm';
import { campaignState } from '../../../../actions';

const dt = (d: Date | null) => (d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '');

export default async function CampaignEditor({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { t, locale } = await getT();
  const [c, cols] = await Promise.all([id === 'new' ? null : prisma.campaign.findUnique({ where: { id } }), prisma.collection.findMany({ where: { archived: false }, orderBy: { sortOrder: 'asc' } })]);
  if (id !== 'new' && !c) notFound();
  return (
    <>
      <h2 className="mb-4 font-display text-2xl font-semibold">{c ? c.name : t('a.campaigns.add')}</h2>
      <Flash error={sp.error} />
      <CampaignForm
        c={{ id: c?.id, name: c?.name ?? '', eyebrowFr: c?.eyebrowFr ?? '', eyebrowEn: c?.eyebrowEn ?? '', headlineFr: c?.headlineFr ?? '', headlineEn: c?.headlineEn ?? '', descFr: c?.descFr ?? '', descEn: c?.descEn ?? '', ctaFr: c?.ctaFr ?? '', ctaEn: c?.ctaEn ?? '', taglineFr: c?.taglineFr ?? '', taglineEn: c?.taglineEn ?? '', desktopImage: c?.desktopImage ?? '', mobileImage: c?.mobileImage ?? '', collectionId: c?.collectionId ?? '', accent: c?.accent ?? 'gold', published: c?.published ?? false, startsAt: dt(c?.startsAt ?? null), endsAt: dt(c?.endsAt ?? null) }}
        collections={cols.map((k) => ({ id: k.id, name: loc(k, 'name', locale), slug: k.slug }))}
      />
      {c && <div className="mt-8 border-t border-gold-line pt-5"><ConfirmButton title={t('a.delete')} text={t('a.confirm.deleteCampaign')} confirmLabel={t('a.delete')} formAction={async () => { 'use server'; const fd = new FormData(); fd.set('id', c.id); fd.set('op', 'delete'); await campaignState(fd); }}>{t('a.delete')}</ConfirmButton></div>}
    </>
  );
}
