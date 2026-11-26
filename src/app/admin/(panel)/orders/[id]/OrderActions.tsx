'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/i18n/client';
import { ConfirmButton } from '@/components/admin/ui';

const PRIMARY = ['markPaid', 'confirm', 'prepare', 'ready', 'deliver', 'deliverPaid', 'reactivate'];

export function OrderActions({ id, actions }: { id: string; actions: string[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const run = async (action: string) => {
    setBusy(true); setErr('');
    const r = await fetch(`/api/admin/orders/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
    const j = await r.json().catch(() => ({}));
    if (!j.ok) setErr(t(`a.err.${j.error}`));
    setBusy(false);
    router.refresh();
  };
  const primary = PRIMARY.filter((a) => actions.includes(a));
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {primary.map((a, i) => <button key={a} disabled={busy} onClick={() => run(a)} className={i === 0 ? 'btn-emerald !min-h-[50px] px-6 text-[16px]' : 'btn-outline'}>{t(`a.act.${a}`)}</button>)}
        {actions.includes('refund') && <ConfirmButton className="btn-outline" danger={false} title={t('a.act.refund')} text={t('a.confirm.refund')} confirmLabel={t('a.act.refund')} onConfirm={() => run('refund')}>{t('a.act.refund')}</ConfirmButton>}
        {actions.includes('cancel') && <ConfirmButton className="btn-ghost text-danger" title={t('a.confirm.cancelTitle')} text={t('a.confirm.cancelText')} confirmLabel={t('a.act.cancel')} onConfirm={() => run('cancel')}>{t('a.act.cancel')}</ConfirmButton>}
      </div>
      {err && <p role="alert" className="rounded border border-red-300 bg-red-50 px-3 py-2 text-red-900">{err}</p>}
    </div>
  );
}
