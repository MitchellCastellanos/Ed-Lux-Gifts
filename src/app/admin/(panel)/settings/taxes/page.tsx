import { getT } from '@/i18n/server';
import { getSettings } from '@/lib/settings';
import { Toggle, SubmitButton, Flash } from '@/components/admin/ui';
import { saveTax } from '../../../actions';

export default async function TaxSettings({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const { t } = await getT();
  const x = (await getSettings()).tax;
  return (
    <form action={saveTax} className="max-w-3xl space-y-6"><Flash ok={sp.ok} error={sp.error} />
      <p className="rounded border border-amber-400 bg-amber-50 px-4 py-3 text-amber-950">{t('a.tax.warning')}</p>
      <section className="space-y-4 rounded-lg border border-gold-line bg-white p-5">
        <fieldset><legend className="label">{t('a.tax.mode')}</legend>
          {(['none', 'gst_qst', 'custom'] as const).map((m) => <label key={m} className="flex items-start gap-3 py-1.5"><input type="radio" name="mode" value={m} defaultChecked={x.mode === m} className="mt-1 h-5 w-5 accent-emerald" /><span><span className="block font-medium">{t(`a.tax.mode.${m}`)}</span><span className="block text-sm text-muted">{t(`a.tax.mode.${m}.help`)}</span></span></label>)}</fieldset>
        <div className="grid gap-4 sm:grid-cols-3"><div><label className="label" htmlFor="g">GST / TPS %</label><input id="g" name="gst" defaultValue={x.gstRatePct} className="input" inputMode="decimal" /></div><div><label className="label" htmlFor="q">QST / TVQ %</label><input id="q" name="qst" defaultValue={x.qstRatePct} className="input" inputMode="decimal" /></div>
          <div><label className="label" htmlFor="c">{t('a.tax.custom')} %</label><input id="c" name="custom" defaultValue={x.customRatePct} className="input" inputMode="decimal" /></div></div>
        <div className="max-w-xs"><label className="label" htmlFor="cl">{t('a.tax.customLabel')}</label><input id="cl" name="customLabel" defaultValue={x.customLabel} className="input" /></div>
        <Toggle name="applyToDelivery" label={t('a.tax.onDelivery')} defaultChecked={x.applyToDelivery} />
        <Toggle name="confirmedByOwner" label={t('a.tax.confirmed')} defaultChecked={x.confirmedByOwner} hint={t('a.tax.confirmedHelp')} />
        <p className="text-sm text-muted">{t('a.tax.note')}</p>
      </section>
      <SubmitButton className="btn-emerald">{t('a.save')}</SubmitButton>
    </form>
  );
}
