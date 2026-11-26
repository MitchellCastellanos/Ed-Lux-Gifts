import { notFound } from 'next/navigation';
import { isLocale, makeT } from '@/i18n';
import { prisma } from '@/lib/db';
import { getSettings } from '@/lib/settings';
import { weekdayName } from '@/lib/schedule';
import { formatTime, pageMeta } from '@/lib/seo';
import { formatMoney } from '@/lib/money';
import { PageHeading, Notice } from '@/components/ui';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = makeT(locale);
  return pageMeta({ locale, path: '/delivery', title: t('delivery.title'), description: t('delivery.sub') });
}

export default async function DeliveryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = makeT(locale);
  const [s, zones] = await Promise.all([getSettings(), prisma.deliveryZone.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' }, include: { prefixes: true } })]);
  const sc = s.schedule;
  const days = sc.deliveryDays.slice().sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((d) => weekdayName(d, locale)).join(locale === 'fr' ? ' et ' : ' & ');
  const unverified = zones.some((z) => !z.verified);
  return (
    <>
      <PageHeading title={t('delivery.title')} sub={t('delivery.sub')} />
      <div className="container-page max-w-4xl space-y-10 py-8">
        {!sc.ordersOpen && <Notice tone="warn">{t('checkout.paused')}</Notice>}
        <section><h2 className="font-display text-2xl font-semibold">{t('delivery.when')}</h2>
          <ul className="mt-3 space-y-2 text-[16px]"><li>{t('delivery.days', { days })}</li><li>{t('delivery.cutoff', { day: weekdayName(sc.cutoffDay, locale), time: formatTime(sc.cutoffTime, locale) })}</li><li>{t('delivery.advance', { n: sc.maxAdvanceWeeks })}</li></ul></section>
        <section><h2 className="font-display text-2xl font-semibold">{t('delivery.zones')}</h2>
          {s.store.mode === 'demo' && unverified && <Notice tone="warn" className="mt-3">{t('delivery.demoZones')}</Notice>}
          <div className="mt-4 overflow-x-auto rounded-lg border border-gold-line bg-white"><table className="w-full min-w-[480px] text-left text-[15px]"><thead className="bg-champagne/60 text-sm"><tr><th className="px-4 py-2.5">{t('delivery.zone')}</th><th className="px-4 py-2.5">{t('delivery.areas')}</th><th className="px-4 py-2.5 text-right">{t('delivery.fee')}</th></tr></thead>
            <tbody className="divide-y divide-gold-line/60">{zones.map((z) => <tr key={z.id}><td className="px-4 py-3 font-medium">{z.name}</td><td className="px-4 py-3">{z.areas}<span className="block text-xs text-muted">{z.prefixes.map((p) => p.prefix).sort().join(', ')}</span></td><td className="px-4 py-3 text-right font-semibold">{formatMoney(z.feeCents, locale)}{z.freeThresholdCents ? <span className="block text-xs font-normal text-muted">{t('delivery.freeOver', { amount: formatMoney(z.freeThresholdCents, locale) })}</span> : null}</td></tr>)}</tbody></table></div>
          <p className="mt-3 text-sm text-muted">{t('delivery.postalNote')}</p></section>
        <section><h2 className="font-display text-2xl font-semibold">{t('delivery.paymentTitle')}</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5">{s.payments.interacEnabled && <li>{t('delivery.payInterac')}</li>}{s.payments.codEnabled && <li>{t('delivery.payCod')}</li>}</ul></section>
      </div>
    </>
  );
}
