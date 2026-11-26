import { getT } from '@/i18n/server';
import { getSettings } from '@/lib/settings';
import { emailProvider } from '@/lib/email';
import { cloudinaryConfigured } from '@/lib/storage';
import { SubmitButton, Flash } from '@/components/admin/ui';
import { saveEmailSettings, sendTestEmail } from '../../../actions';
import { CheckCircle2, XCircle } from 'lucide-react';

export default async function Comms({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const { t } = await getT();
  const s = await getSettings();
  const prov = emailProvider();
  const Row = ({ ok, label, help }: { ok: boolean; label: string; help?: string }) => <li className="flex items-start gap-3 py-2.5">{ok ? <CheckCircle2 className="mt-0.5 text-emerald" aria-hidden /> : <XCircle className="mt-0.5 text-danger" aria-hidden />}<span><span className="font-medium">{label}</span> <span className="badge ml-1 border-neutral-300">{ok ? t('a.comms.on') : t('a.comms.off')}</span>{help && <span className="block text-sm text-muted">{help}</span>}</span></li>;
  return (
    <div className="max-w-3xl space-y-6"><Flash ok={sp.ok} error={sp.error} />
      <section className="rounded-lg border border-gold-line bg-white p-5"><h2 className="font-display text-xl font-semibold">{t('a.comms.status')}</h2>
        <ul className="divide-y divide-gold-line/60">
          <Row ok={prov !== 'none'} label={t('a.comms.provider', { p: prov === 'dev' ? t('a.comms.devAdapter') : prov === 'resend' ? 'Resend' : t('a.comms.none') })} help={prov === 'dev' ? t('a.comms.devHelp') : prov === 'none' ? t('a.comms.noneHelp') : undefined} />
          <Row ok={prov !== 'none'} label={t('a.comms.confirmEmails')} />
          <Row ok={prov !== 'none'} label={t('a.comms.verifyEmails')} help={prov === 'none' ? t('a.comms.verifyOff') : undefined} />
          <Row ok={cloudinaryConfigured()} label={t('a.comms.images')} help={cloudinaryConfigured() ? undefined : t('a.comms.imagesHelp')} />
        </ul></section>
      <section className="rounded-lg border border-gold-line bg-white p-5"><h2 className="font-display text-xl font-semibold">{t('a.comms.test')}</h2><p className="text-sm text-muted">{t('a.comms.testHelp')}</p>
        <form action={sendTestEmail} className="mt-3"><SubmitButton className="btn-outline">{t('a.comms.sendTest')}</SubmitButton></form>{s.email.historyVerificationTested && <p className="mt-2 text-sm text-emerald">✓ {t('a.comms.tested')}</p>}</section>
      <form action={saveEmailSettings} className="space-y-4 rounded-lg border border-gold-line bg-white p-5"><h2 className="font-display text-xl font-semibold">{t('a.comms.sender')}</h2>
        <div><label className="label" htmlFor="sn">{t('a.comms.senderName')}</label><input id="sn" name="senderName" defaultValue={s.email.senderName} className="input" /></div>
        <div><label className="label" htmlFor="rt">{t('a.comms.replyTo')}</label><input id="rt" name="replyTo" type="email" defaultValue={s.email.replyTo} className="input" /><p className="hint">{t('a.comms.keysHelp')}</p></div>
        <SubmitButton>{t('a.save')}</SubmitButton></form>
    </div>
  );
}
