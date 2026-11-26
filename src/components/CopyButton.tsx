'use client';
import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { useI18n } from '@/i18n/client';

export function CopyButton({ value, label }: { value: string; label: string }) {
  const { t } = useI18n();
  const [ok, setOk] = useState(false);
  return (
    <button type="button" className="btn-outline btn-sm" aria-label={`${t('common.copy')}: ${label}`}
      onClick={async () => { try { await navigator.clipboard.writeText(value); } catch { const i = document.createElement('input'); i.value = value; document.body.appendChild(i); i.select(); document.execCommand('copy'); i.remove(); } setOk(true); setTimeout(() => setOk(false), 1800); }}>
      {ok ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />} <span aria-live="polite">{ok ? t('common.copied') : t('common.copy')}</span>
    </button>
  );
}

export function PrintButton() {
  const { t } = useI18n();
  return <button type="button" className="btn-outline" onClick={() => window.print()}>{t('order.print')}</button>;
}
