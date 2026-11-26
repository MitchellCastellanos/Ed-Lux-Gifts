import { headers } from 'next/headers';
import { makeT, isLocale } from './index';
import type { Locale } from '@/lib/money';

export async function currentLocale(): Promise<Locale> {
  const l = (await headers()).get('x-locale') ?? 'fr';
  return isLocale(l) ? l : 'fr';
}
export async function getT(locale?: Locale) {
  const l = locale ?? (await currentLocale());
  return { t: makeT(l), locale: l };
}
