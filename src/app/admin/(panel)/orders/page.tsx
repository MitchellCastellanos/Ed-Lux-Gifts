import Link from 'next/link';
import { Printer, Truck } from 'lucide-react';
import { getT } from '@/i18n/server';
import { queryWorkspace } from '@/lib/admin-orders';
import { expireReservations } from '@/lib/orders';
import { PageTitle } from '@/components/admin/AdminNav';
import { OrdersWorkspace } from './OrdersWorkspace';

export default async function OrdersPage() {
  const { t } = await getT();
  await expireReservations().catch(() => {});
  const initial = await queryWorkspace({ filter: 'all' });
  return (
    <>
      <PageTitle title={t('a.nav.orders')} sub={t('a.orders.sub')}>
        <Link href="/admin/orders/prep" className="btn-outline"><Printer size={17} aria-hidden /> {t('a.prep.title')}</Link>
        <Link href="/admin/orders/deliveries" className="btn-outline"><Truck size={17} aria-hidden /> {t('a.deliveries.title')}</Link>
      </PageTitle>
      <OrdersWorkspace initial={initial} />
    </>
  );
}
