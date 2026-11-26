import { getT } from '@/i18n/server';
import { PageTitle } from '@/components/admin/AdminNav';
import { Tabs } from '@/components/admin/ui';

export default async function CatalogLayout({ children }: { children: React.ReactNode }) {
  const { t } = await getT();
  return (
    <>
      <PageTitle title={t('a.nav.catalog')} sub={t('a.catalog.sub')} />
      <Tabs items={[{ href: '/admin/catalog/baskets', label: t('a.tab.baskets') }, { href: '/admin/catalog/items', label: t('a.tab.items') }, { href: '/admin/catalog/bases', label: t('a.tab.bases') }, { href: '/admin/catalog/categories', label: t('a.tab.categories') }, { href: '/admin/catalog/inventory', label: t('a.tab.inventory') }]} />
      {children}
    </>
  );
}
