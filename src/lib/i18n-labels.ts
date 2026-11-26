export function loc<T extends Record<string, any>>(obj: T, field: string, locale: 'fr' | 'en'): string {
  const a = obj[`${field}${locale === 'fr' ? 'Fr' : 'En'}`] as string | undefined;
  const b = obj[`${field}${locale === 'fr' ? 'En' : 'Fr'}`] as string | undefined;
  return (a && a.trim()) || b || '';
}
