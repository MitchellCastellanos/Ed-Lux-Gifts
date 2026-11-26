import { getT } from '@/i18n/server';
import { getSettings, isFictionalEmail } from '@/lib/settings';
import { BiField, Toggle, SubmitButton, Flash } from '@/components/admin/ui';
import { savePayments } from '../../../actions';

export default async function PaymentSettings({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const { t } = await getT();
  const p = (await getSettings()).payments;
  const card = 'space-y-4 rounded-lg border border-gold-line bg-white p-5';
  return (
    <form action={savePayments} className="max-w-3xl space-y-6"><Flash ok={sp.ok} error={sp.error} />
      <section className={card}><h2 className="font-display text-xl font-semibold">{t('pay.interac')}</h2>
        <Toggle name="interacEnabled" label={t('a.pay.enableInterac')} defaultChecked={p.interacEnabled} />
        <div><label className="label" htmlFor="ie">{t('a.pay.interacEmail')}</label><input id="ie" name="interacEmail" type="email" defaultValue={p.interacEmail} className="input" />
          {isFictionalEmail(p.interacEmail) && <p className="mt-1 rounded bg-amber-50 px-3 py-2 text-sm text-amber-950">{t('a.pay.fictional')}</p>}</div>
        <BiField name="interacInstructions" label={t('a.pay.instructions')} defaultFr={p.interacInstructionsFr} defaultEn={p.interacInstructionsEn} textarea rows={3} />
        <div className="max-w-xs"><label className="label" htmlFor="dl">{t('a.pay.deadline')}</label><input id="dl" name="deadline" type="number" min={1} defaultValue={p.interacDeadlineHours} className="input" /><p className="hint">{t('a.pay.deadlineHelp')}</p></div></section>
      <section className={card}><h2 className="font-display text-xl font-semibold">{t('checkout.payLater')}</h2>
        <Toggle name="codEnabled" label={t('a.pay.enableCod')} defaultChecked={p.codEnabled} />
        <div className="ml-8 space-y-1"><Toggle name="codCash" label={t('pay.codCash')} defaultChecked={p.codCash} /><Toggle name="codInterac" label={t('pay.codInterac')} defaultChecked={p.codInterac} /></div></section>
      <SubmitButton className="btn-emerald">{t('a.save')}</SubmitButton>
    </form>
  );
}
