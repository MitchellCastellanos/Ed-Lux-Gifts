export type Locale = 'fr' | 'en';

export function formatMoney(cents: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === 'fr' ? 'fr-CA' : 'en-CA', { style: 'currency', currency: 'CAD' }).format(cents / 100);
}

/** Parse a user-typed amount like "12,50" or "12.5" to integer cents. Returns null when invalid. */
export function parseCents(input: string): number | null {
  const s = String(input ?? '').trim().replace(/\s/g, '').replace(',', '.').replace(/^\$/, '');
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  return Math.round(parseFloat(s) * 100);
}

export function centsToInput(cents: number, locale: Locale = 'en'): string {
  const s = (cents / 100).toFixed(2);
  return locale === 'fr' ? s.replace('.', ',') : s;
}
