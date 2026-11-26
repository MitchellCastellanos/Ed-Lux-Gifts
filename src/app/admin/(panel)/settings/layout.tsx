import { getT } from '@/i18n/server';
import { PageTitle } from '@/components/admin/AdminNav';
import { Tabs } from '@/components/admin/ui';

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const { t } = await getT();
  const tabs = ['business', 'payments', 'delivery', 'schedule', 'taxes', 'communications', 'account', 'launch'];
  return (<><PageTitle title={t('a.nav.settings')} sub={t('a.settings.sub')} /><Tabs items={tabs.map((k) => ({ href: `/admin/settings/${k}`, label: t(`a.tab.${k}`) }))} />{children}</>);
}
