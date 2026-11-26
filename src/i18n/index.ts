import { fr } from './fr';
import { en } from './en';
import type { Locale } from '@/lib/money';

export const LOCALES: Locale[] = ['fr', 'en'];
export const dictionaries: Record<Locale, Record<string, string>> = { fr, en };
export type TFn = (key: string, vars?: Record<string, string | number>) => string;

export function makeT(locale: Locale): TFn {
  const d = dictionaries[locale];
  return (key, vars) => {
    let s = d[key] ?? dictionaries.fr[key] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
    return s;
  };
}

export const isLocale = (s: string): s is Locale => s === 'fr' || s === 'en';
