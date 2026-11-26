import { getT } from '@/i18n/server';
import { PageTitle } from '@/components/admin/AdminNav';
import { Tabs } from '@/components/admin/ui';

export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const { t } = await getT();
  return (<><PageTitle title={t('a.nav.storefront')} sub={t('a.storefront.sub')} /><Tabs items={[{ href: '/admin/storefront/campaigns', label: t('a.tab.campaigns') }, { href: '/admin/storefront/collections', label: t('a.tab.collections') }, { href: '/admin/storefront/featured', label: t('a.tab.featured') }]} />{children}</>);
}
