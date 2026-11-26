import Link from 'next/link';
import { CheckCircle2, Circle } from 'lucide-react';
import { getT } from '@/i18n/server';
import { prisma } from '@/lib/db';
import { getSettings, isFictionalEmail } from '@/lib/settings';
import { emailConfigured } from '@/lib/email';
import { Flash, ConfirmButton } from '@/components/admin/ui';
import { toggleOnboarding, goLive, demoCleanup } from '../../../actions';

export default async function Launch({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const { t } = await getT();
  const [s, zones, demo] = await Promise.all([getSettings(), prisma.deliveryZone.findMany({ where: { active: true } }), Promise.all([
    prisma.order.count({ where: { isDemo: true } }), prisma.customer.count({ where: { isDemo: true, orders: { none: {} } } }),
    prisma.product.count({ where: { isDemo: true } }), prisma.component.count({ where: { isDemo: true } }),
  ])]);
  const live = s.store.mode === 'live';
  const items: { key: string; auto: boolean; href: string }[] = [
    { key: 'business', auto: s.business.verified, href: '/admin/settings/business' },
    { key: 'payments', auto: !s.payments.interacEnabled || !isFictionalEmail(s.payments.interacEmail), href: '/admin/settings/payments' },
    { key: 'delivery', auto: zones.length > 0 && zones.every((z) => z.verified), href: '/admin/settings/delivery' },
    { key: 'schedule', auto: !!s.store.onboarding.schedule, href: '/admin/settings/schedule' },
    { key: 'catalog', auto: !!s.store.onboarding.catalog, href: '/admin/catalog' },
    { key: 'tax', auto: s.tax.confirmedByOwner, href: '/admin/settings/taxes' },
    { key: 'campaign', auto: !!s.store.onboarding.campaign, href: '/admin/storefront' },
    { key: 'email', auto: emailConfigured(), href: '/admin/settings/communications' },
    { key: 'verifyTest', auto: s.email.historyVerificationTested, href: '/admin/settings/communications' },
    { key: 'testOrder', auto: !!s.store.onboarding.testOrder, href: '/fr/baskets' },
  ];
  const manual = new Set(['schedule', 'catalog', 'campaign', 'testOrder']);
  const doneCount = items.filter((i) => i.auto).length;
  const errs = sp.error?.startsWith('launch:') ? sp.error.slice(7).split(',') : [];
  return (
    <div className="max-w-3xl space-y-6"><Flash ok={sp.ok} error={errs.length ? undefined : sp.error} />
      {errs.length > 0 && <div role="alert" className="rounded border border-red-300 bg-red-50 px-4 py-3 text-red-900"><p className="font-semibold">{t('a.launch.blocked')}</p><ul className="mt-1 list-disc pl-5">{errs.map((e) => <li key={e}>{t(`a.launch.need.${e}`)}</li>)}</ul></div>}
      <section className={`rounded-lg border-2 p-5 ${live ? 'border-emerald bg-emerald-soft' : 'border-burgundy bg-white'}`}>
        <h2 className="font-display text-xl font-semibold">{live ? t('a.launch.liveTitle') : t('a.launch.demoTitle')}</h2>
        <p className="mt-1 text-[15px]">{live ? t('a.launch.liveText') : t('a.launch.demoText')}</p>
        {!live && <form action={goLive} className="mt-4"><ConfirmButton className="btn-gold" danger={false} title={t('a.launch.goLive')} text={t('a.launch.goLiveConfirm')} confirmLabel={t('a.launch.goLive')} formAction={async () => { 'use server'; await goLive(); }}>{t('a.launch.goLive')}</ConfirmButton></form>}
      </section>
      <section className="rounded-lg border border-gold-line bg-white p-5"><h2 className="font-display text-xl font-semibold">{t('a.launch.checklist')} <span className="text-base font-normal text-muted">({doneCount}/{items.length})</span></h2>
        <ul className="mt-3 divide-y divide-gold-line/60">{items.map((i) => (
          <li key={i.key} className="flex flex-wrap items-center gap-3 py-3">{i.auto ? <CheckCircle2 className="text-emerald" aria-hidden /> : <Circle className="text-muted" aria-hidden />}
            <span className="min-w-[200px] flex-1"><span className={`block font-medium ${i.auto ? 'text-muted line-through' : ''}`}>{t(`a.launch.item.${i.key}`)}</span><span className="block text-sm text-muted">{t(`a.launch.item.${i.key}.help`)}</span></span>
            <Link href={i.href} className="btn-outline btn-sm">{t('a.launch.open')}</Link>
            {manual.has(i.key) && <form action={toggleOnboarding}><input type="hidden" name="key" value={i.key} /><input type="hidden" name="done" value={String(!i.auto)} /><button className="btn-ghost btn-sm">{i.auto ? t('a.launch.unmark') : t('a.launch.mark')}</button></form>}</li>))}</ul></section>
      <section className="space-y-4 rounded-lg border border-gold-line bg-white p-5"><h2 className="font-display text-xl font-semibold">{t('a.launch.cleanup')}</h2><p className="text-sm text-muted">{t('a.launch.cleanupHelp')}</p>
        {([['orders', demo[0]], ['customers', demo[1]], ['catalog', demo[2] + demo[3]]] as const).map(([k, n]) => (
          <div key={k} className="flex flex-wrap items-center justify-between gap-3 border-t border-gold-line/60 pt-3"><span><b>{t(`a.launch.clean.${k}`)}</b> <span className="text-muted">({n})</span><span className="block text-sm text-muted">{t(`a.launch.clean.${k}.help`)}</span></span>
            <ConfirmButton title={t(`a.launch.clean.${k}`)} text={t('a.launch.cleanConfirm')} confirmLabel={t('a.delete')} formAction={async () => { 'use server'; const fd = new FormData(); fd.set('what', k); await demoCleanup(fd); }}>{t('a.launch.clean.run')}</ConfirmButton></div>
        ))}</section>
    </div>
  );
}
