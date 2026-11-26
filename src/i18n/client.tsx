'use client';
import { createContext, useContext, useMemo } from 'react';
import { makeT, type TFn } from './index';
import type { Locale } from '@/lib/money';

const Ctx = createContext<{ locale: Locale; t: TFn }>({ locale: 'fr', t: (k) => k });
export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const v = useMemo(() => ({ locale, t: makeT(locale) }), [locale]);
  return <Ctx.Provider value={v}>{children}</Ctx.Provider>;
}
export const useI18n = () => useContext(Ctx);
