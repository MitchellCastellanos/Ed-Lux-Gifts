import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js/max';

export type PhoneResult = { ok: true; e164: string; display: string } | { ok: false };

/** Normalize any phone input to E.164. Defaults to Canada; accepts international numbers with a + prefix. */
export function normalizePhone(input: string, defaultCountry: CountryCode = 'CA'): PhoneResult {
  const raw = (input ?? '').trim();
  if (!raw || raw.length > 40) return { ok: false };
  const parsed = parsePhoneNumberFromString(raw, defaultCountry);
  if (!parsed || !parsed.isValid()) return { ok: false };
  const e164 = parsed.number;
  const display = parsed.country === 'CA' || parsed.country === 'US' ? parsed.formatNational() : parsed.formatInternational();
  return { ok: true, e164, display };
}

/** Format an E.164 value for display (used for stored numbers). */
export function formatPhone(e164: string): string {
  const p = parsePhoneNumberFromString(e164);
  if (!p) return e164;
  return p.country === 'CA' || p.country === 'US' ? p.formatNational() : p.formatInternational();
}

/** Digits only, used for partial phone search. */
export function phoneDigits(input: string): string {
  return (input ?? '').replace(/\D/g, '');
}
