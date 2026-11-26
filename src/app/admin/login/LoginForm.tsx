'use client';
import { useActionState } from 'react';
import { loginAction } from '../actions';
import { SubmitButton } from '@/components/admin/ui';
import { useI18n } from '@/i18n/client';

export function LoginForm() {
  const { t } = useI18n();
  const [state, action] = useActionState(loginAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <h1 className="text-center font-display text-2xl font-semibold">{t('a.login.title')}</h1>
      {state?.error && <p role="alert" className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">{t(`a.login.${state.error}`)}</p>}
      <div><label htmlFor="email" className="label">{t('checkout.email')}</label><input id="email" name="email" type="email" autoComplete="username" required className="input" /></div>
      <div><label htmlFor="password" className="label">{t('a.login.password')}</label><input id="password" name="password" type="password" autoComplete="current-password" required className="input" /></div>
      <SubmitButton className="btn-emerald w-full" pendingText={t('common.loading')}>{t('a.login.submit')}</SubmitButton>
    </form>
  );
}
