'use client';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { useI18n } from '@/i18n/client';

export function LogoutButton() {
  const { t, locale } = useI18n();
  const router = useRouter();
  return (
    <button type="button" className="btn-outline btn-sm" onClick={async () => { await fetch('/api/my-orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'logout' }) }); router.push(`/${locale}/my-orders`); router.refresh(); }}>
      <LogOut size={15} aria-hidden /> {t('orders.logout')}
    </button>
  );
}
