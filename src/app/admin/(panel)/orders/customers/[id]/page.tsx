import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Phone, Mail } from 'lucide-react';
import { getT } from '@/i18n/server';
import { prisma } from '@/lib/db';
import { formatMoney } from '@/lib/money';
import { formatDate, formatDateTime } from '@/lib/schedule';
import { PageTitle } from '@/components/admin/AdminNav';
import { StatusBadge } from '@/components/StatusBadge';
import { Flash, SubmitButton, ConfirmButton } from '@/components/admin/ui';
import { CopyPhone } from '../../OrdersWorkspace';
import { saveCustomer, anonymizeCustomerAction } from '../../../../actions';

export default async function CustomerPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { t, locale } = await getT();
  const c = await prisma.customer.findUnique({ where: { id }, include: { orders: { orderBy: { createdAt: 'desc' } } } });
  if (!c) notFound();
  const done = (f: string) => f === 'DELIVERED';
  const active = c.orders.filter((o) => !['DELIVERED', 'CANCELLED'].includes(o.fulfillmentStatus));
  const past = c.orders.filter((o) => done(o.fulfillmentStatus));
  const cancelled = c.orders.filter((o) => o.fulfillmentStatus === 'CANCELLED');
  const last = c.orders[0];
  const collision = sp.error?.startsWith('collision:') ? sp.error.split(':')[1] : null;
  const Row = ({ o }: { o: (typeof c.orders)[number] }) => (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
      <Link href={`/admin/orders/${o.id}`} className="font-semibold text-emerald underline underline-offset-2">{o.number}</Link>
      <span className="text-sm capitalize text-muted">{formatDate(o.deliveryDate, locale, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
      <span className="font-medium">{formatMoney(o.totalCents, locale)}</span>
      <span className="ml-auto flex flex-wrap gap-2"><StatusBadge kind="p" value={o.paymentStatus} t={t} /><StatusBadge kind="f" value={o.fulfillmentStatus} t={t} /></span>
      {o.purchaserName !== c.name && <span className="w-full text-xs text-amber-900">{t('a.customer.orderedBy', { name: o.purchaserName, email: o.purchaserEmail })}</span>}
    </li>
  );
  const Section = ({ title, list }: { title: string; list: typeof c.orders }) => list.length ? <section className="rounded-lg border border-gold-line bg-white p-5"><h2 className="font-display text-xl font-semibold">{title} ({list.length})</h2><ul className="divide-y divide-gold-line/60">{list.map((o) => <Row key={o.id} o={o} />)}</ul></section> : null;
  return (
    <>
      <p className="mb-2 text-sm"><Link href="/admin/orders" className="text-emerald underline">← {t('a.nav.orders')}</Link></p>
      <PageTitle title={c.name} sub={c.isDemo ? t('demo.orderBanner') : undefined} />
      <Flash ok={collision ? undefined : sp.ok} error={collision ? undefined : sp.error} />
      {collision && <p role="alert" className="mb-5 rounded border border-red-300 bg-red-50 px-4 py-3 text-red-900">{t('a.customer.collision')} <Link href={`/admin/orders/customers/${collision}`} className="font-semibold underline">{t('a.customer.open')}</Link></p>}
      <div className="mb-6 grid gap-4 rounded-lg border-2 border-gold bg-white p-5 md:grid-cols-[1fr_auto]">
        <div>
          <p className="flex flex-wrap items-center gap-3 text-[24px] font-semibold"><a href={`tel:${c.phoneE164}`} className="flex items-center gap-2 underline"><Phone size={22} aria-hidden />{c.phoneDisplay}</a><CopyPhone value={c.phoneE164} label={t('a.customer.copyPhone')} /></p>
          {c.email && <p className="mt-1 flex items-center gap-2 text-[15px]"><Mail size={16} aria-hidden />{c.email}{c.emailVerifiedAt && <span className="badge border-emerald/40 bg-emerald-soft text-emerald">{t('a.customer.verified')}</span>}</p>}
        </div>
        <dl className="grid grid-cols-3 gap-5 text-center">
          <div><dt className="text-xs text-muted">{t('a.customer.total')}</dt><dd className="font-display text-2xl font-semibold text-emerald">{c.orders.length}</dd></div>
          <div><dt className="text-xs text-muted">{t('a.customer.active')}</dt><dd className="font-display text-2xl font-semibold text-emerald">{active.length}</dd></div>
          <div><dt className="text-xs text-muted">{t('a.customer.last')}</dt><dd className="mt-1 text-sm font-medium">{last ? formatDateTime(last.createdAt, locale).split(',')[0] : '—'}</dd></div>
        </dl>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Section title={t('orders.active')} list={active} /><Section title={t('orders.previous')} list={past} /><Section title={t('a.filter.cancelled')} list={cancelled} />
        </div>
        <section className="h-fit rounded-lg border border-gold-line bg-white p-5">
          <h2 className="font-display text-xl font-semibold">{t('a.customer.edit')}</h2>
          <form action={saveCustomer} className="mt-3 space-y-3">
            <input type="hidden" name="id" value={c.id} />
            <div><label className="label" htmlFor="cn">{t('checkout.name')}</label><input id="cn" name="name" defaultValue={c.name} className="input" required /></div>
            <div><label className="label" htmlFor="cp">{t('checkout.phone')}</label><input id="cp" name="phone" type="tel" inputMode="tel" defaultValue={c.phoneDisplay} className="input" /><p className="hint">{t('a.customer.phoneHelp')}</p></div>
            <div><label className="label" htmlFor="ce">{t('checkout.email')}</label><input id="ce" name="email" type="email" defaultValue={c.email ?? ''} className="input" /></div>
            <div><label className="label" htmlFor="cno">{t('a.customer.notes')}</label><textarea id="cno" name="notes" rows={4} defaultValue={c.notes} className="input" /><p className="hint">{t('a.customer.notesHelp')}</p></div>
            <SubmitButton>{t('a.save')}</SubmitButton>
          </form>
          <div className="mt-6 border-t border-gold-line pt-4"><h3 className="font-medium">{t('a.customer.erase')}</h3><p className="mb-3 text-sm text-muted">{t('a.customer.eraseHelp')}</p>
            <ConfirmButton className="btn-outline btn-sm text-danger" title={t('a.customer.erase')} text={t('a.customer.eraseConfirm')} confirmLabel={t('a.customer.eraseRun')} formAction={async () => { 'use server'; const fd = new FormData(); fd.set('id', c.id); await anonymizeCustomerAction(fd); }}>{t('a.customer.eraseRun')}</ConfirmButton></div>
        </section>
      </div>
    </>
  );
}
