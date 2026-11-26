import { getT } from '@/i18n/server';
import { requireAdmin } from '@/lib/auth';
import { SubmitButton, Flash } from '@/components/admin/ui';
import { changePasswordAction, logoutAction } from '../../../actions';

export default async function Account({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const { t } = await getT();
  const s = await requireAdmin();
  return (
    <div className="max-w-xl space-y-6"><Flash ok={sp.ok} error={sp.error} />
      <section className="rounded-lg border border-gold-line bg-white p-5"><h2 className="font-display text-xl font-semibold">{t('a.account.profile')}</h2><p className="mt-2">{s.user.name}</p><p className="text-muted">{s.user.email}</p></section>
      <form action={changePasswordAction} className="space-y-4 rounded-lg border border-gold-line bg-white p-5"><h2 className="font-display text-xl font-semibold">{t('a.account.password')}</h2>
        <div><label className="label" htmlFor="cur">{t('a.account.current')}</label><input id="cur" name="current" type="password" autoComplete="current-password" required className="input" /></div>
        <div><label className="label" htmlFor="nw">{t('a.account.new')}</label><input id="nw" name="next" type="password" autoComplete="new-password" minLength={10} required className="input" /><p className="hint">{t('a.account.minLength')}</p></div>
        <div><label className="label" htmlFor="cf">{t('a.account.confirm')}</label><input id="cf" name="confirm" type="password" autoComplete="new-password" minLength={10} required className="input" /></div>
        <SubmitButton>{t('a.save')}</SubmitButton></form>
      <form action={logoutAction}><button className="btn-outline">{t('a.logout')}</button></form>
    </div>
  );
}
