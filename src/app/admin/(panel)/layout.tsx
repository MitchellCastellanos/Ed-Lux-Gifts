import { requireAdmin } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { AdminShell } from '@/components/admin/AdminNav';

export const dynamic = 'force-dynamic';

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  const s = await getSettings();
  return <AdminShell email={session.user.email} demo={s.store.mode === 'demo'}>{children}</AdminShell>;
}
