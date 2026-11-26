/** Canadian postal codes: letters D,F,I,O,Q,U are never used; first letter excludes W and Z. */
const CA_POSTAL = /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z]\d[ABCEGHJ-NPRSTV-Z]\d$/;

export function normalizePostalCode(input: string): string | null {
  const s = (input ?? '').toUpperCase().replace(/[\s-]/g, '');
  if (!CA_POSTAL.test(s)) return null;
  return `${s.slice(0, 3)} ${s.slice(3)}`;
}

export function postalPrefix(postal: string): string {
  return postal.replace(/\s/g, '').toUpperCase().slice(0, 3);
}

/** Validates a delivery-zone prefix (forward sortation area, 3 chars). */
export function normalizePrefix(input: string): string | null {
  const s = (input ?? '').toUpperCase().replace(/[\s-]/g, '').slice(0, 3);
  return /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z]$/.test(s) ? s : null;
}
