import { getT } from '@/i18n/server';
import { getSettings } from '@/lib/settings';
import { BiField, Toggle, SubmitButton, Flash } from '@/components/admin/ui';
import { saveBusiness } from '../../../actions';

export default async function BusinessSettings({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const { t } = await getT();
  const s = await getSettings();
  const b = s.business;
  const card = 'space-y-4 rounded-lg border border-gold-line bg-white p-5';
  const F = (name: string, label: string, v: string, type = 'text', hint?: string) => <div><label className="label" htmlFor={name}>{label}</label><input id={name} name={name} type={type} defaultValue={v} className="input" />{hint && <p className="hint">{hint}</p>}</div>;
  return (
    <form action={saveBusiness} className="max-w-3xl space-y-6"><Flash ok={sp.ok} error={sp.error} />
      <section className={card}><h2 className="font-display text-xl font-semibold">{t('a.settings.business')}</h2>
        {F('name', t('a.field.businessName'), b.name)}
        <div className="grid gap-4 sm:grid-cols-2">{F('email', t('checkout.email'), b.email, 'email')}{F('phone', t('checkout.phone'), b.phone, 'tel')}</div>
        <div className="grid gap-4 sm:grid-cols-3">{F('addressLine', t('a.field.address'), b.addressLine)}{F('city', t('checkout.city'), b.city)}{F('postalCode', t('checkout.postal'), b.postalCode)}</div>
        <div className="grid gap-4 sm:grid-cols-2">{F('instagram', 'Instagram (URL)', b.instagram, 'url')}{F('facebook', 'Facebook (URL)', b.facebook, 'url')}</div>
        <BiField name="about" label={t('a.field.about')} defaultFr={b.aboutFr} defaultEn={b.aboutEn} textarea rows={4} />
        <BiField name="hours" label={t('a.field.hours')} defaultFr={b.hoursFr} defaultEn={b.hoursEn} />
        <Toggle name="verified" label={t('a.field.businessVerified')} defaultChecked={b.verified} hint={t('a.field.businessVerifiedHelp')} />
      </section>
      <section className={card}><h2 className="font-display text-xl font-semibold">{t('a.settings.privacy')}</h2>
        <div className="max-w-xs"><label className="label" htmlFor="retention">{t('a.field.retention')}</label><input id="retention" name="retention" type="number" min={12} max={120} defaultValue={s.retention.orderRetentionMonths} className="input" /><p className="hint">{t('a.field.retentionHelp')}</p></div></section>
      <SubmitButton className="btn-emerald">{t('a.save')}</SubmitButton>
    </form>
  );
}
