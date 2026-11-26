import { describe, it, expect } from 'vitest';
import { normalizePhone, phoneDigits } from '@/lib/phone';
import { normalizePostalCode, postalPrefix, normalizePrefix } from '@/lib/postal';
import { dateStatus, candidateDates, cutoffFor, zonedToUtc, businessToday, groupByCycle, type ScheduleSettings } from '@/lib/schedule';
import { priceCustomBasket, computeTaxes, deliveryFee } from '@/lib/pricing';
import { parseCents, formatMoney } from '@/lib/money';
import { fr } from '@/i18n/fr';
import { en } from '@/i18n/en';

describe('phone normalization', () => {
  it('resolves every Canadian format to the same E.164', () => {
    for (const f of ['514-555-0123', '(514) 555-0123', '5145550123', '+1 514 555 0123', '1 (514) 555-0123', '514.555.0123']) {
      const r = normalizePhone(f);
      expect(r.ok && r.e164).toBe('+15145550123');
    }
  });
  it('accepts valid international numbers and rejects junk', () => {
    expect(normalizePhone('+33 1 23 45 67 89').ok).toBe(true);
    expect(normalizePhone('+44 20 7946 0958')).toMatchObject({ ok: true, e164: '+442079460958' });
    for (const bad of ['', 'abc', '123', '514-555', '+1 000 000 0000']) expect(normalizePhone(bad).ok).toBe(false);
  });
  it('extracts digits for partial search', () => expect(phoneDigits('(514) 55')).toBe('51455'));
});

describe('postal codes', () => {
  it('normalizes and validates', () => {
    expect(normalizePostalCode('h9r1a1')).toBe('H9R 1A1');
    expect(normalizePostalCode(' h9r-1a1 ')).toBe('H9R 1A1');
    expect(normalizePostalCode('D9R 1A1')).toBeNull();
    expect(normalizePostalCode('12345')).toBeNull();
    expect(postalPrefix('H9R 1A1')).toBe('H9R');
    expect(normalizePrefix('h9r 1a1')).toBe('H9R');
  });
});

const S: ScheduleSettings = { ordersOpen: true, cutoffDay: 5, cutoffTime: '13:00', deliveryDays: [6, 0], maxAdvanceWeeks: 3, maxOrdersPerDay: 10, closedDates: [] };
const at = (iso: string) => new Date(iso);

describe('schedule (America/Toronto)', () => {
  it('computes the Friday 13:00 cutoff for both weekend days', () => {
    expect(cutoffFor('2026-12-05', S).toISOString()).toBe('2026-12-04T18:00:00.000Z'); // EST = UTC-5
    expect(cutoffFor('2026-12-06', S).toISOString()).toBe('2026-12-04T18:00:00.000Z');
    expect(cutoffFor('2026-07-11', S).toISOString()).toBe('2026-07-10T17:00:00.000Z'); // EDT = UTC-4
  });
  it('current weekend is open before the cutoff', () => {
    expect(dateStatus('2026-12-05', at('2026-12-04T17:59:00Z'), S)).toBe('open'); // Fri 12:59
    expect(dateStatus('2026-12-06', at('2026-12-04T17:59:00Z'), S)).toBe('open');
  });
  it('current weekend closes at Friday 1 PM, next weekend stays open', () => {
    const now = at('2026-12-04T18:00:00Z');
    expect(dateStatus('2026-12-05', now, S)).toBe('cutoff');
    expect(dateStatus('2026-12-06', now, S)).toBe('cutoff');
    expect(dateStatus('2026-12-12', now, S)).toBe('open');
  });
  it('handles Saturday/Sunday after cutoff by offering only next weekend', () => {
    const open = candidateDates(at('2026-12-05T20:00:00Z'), S).filter((d) => d.status === 'open').map((d) => d.date);
    expect(open[0]).toBe('2026-12-12');
  });
  it('rejects non-delivery days, closed dates, paused store and far-future dates', () => {
    expect(dateStatus('2026-12-07', at('2026-12-01T15:00:00Z'), S)).toBe('not_delivery_day');
    expect(dateStatus('2026-12-05', at('2026-12-01T15:00:00Z'), { ...S, closedDates: ['2026-12-05'] })).toBe('closed');
    expect(dateStatus('2026-12-05', at('2026-12-01T15:00:00Z'), { ...S, ordersOpen: false })).toBe('paused');
    expect(dateStatus('2027-02-06', at('2026-12-01T15:00:00Z'), S)).toBe('too_far');
    expect(dateStatus('2026-12-01', at('2026-12-01T15:00:00Z'), S)).toBe('past');
  });
  it('uses the Toronto business date near midnight UTC', () => {
    expect(businessToday(at('2026-12-02T03:30:00Z'))).toBe('2026-12-01');
  });
  it('round-trips wall-clock → UTC across DST', () => {
    expect(zonedToUtc(2026, 3, 8, 12, 0).toISOString()).toBe('2026-03-08T16:00:00.000Z');
  });
  it('groups weekend days into one cycle', () => {
    expect(groupByCycle(['2026-12-05', '2026-12-06', '2026-12-12'], S)).toEqual([['2026-12-05', '2026-12-06'], ['2026-12-12']]);
  });
});

describe('custom basket pricing', () => {
  const base = { id: 'b', priceCents: 2000, capacity: 6, includedOptionIds: ['ribbon'] };
  const items = new Map([['c', { id: 'c', priceCents: 1000, capacityCost: 2 }], ['k', { id: 'k', priceCents: 1500, capacityCost: 3 }]]);
  const opts = new Map([['ribbon', { id: 'ribbon', priceCents: 400 }], ['card', { id: 'card', priceCents: 300 }]]);
  it('base + items × qty + paid options; included options are free', () => {
    const r = priceCustomBasket(base, items, opts, { baseId: 'b', lines: [{ componentId: 'c', quantity: 1 }, { componentId: 'k', quantity: 1 }], optionIds: ['ribbon', 'card'] });
    expect(r).toMatchObject({ ok: true, unitCents: 2000 + 1000 + 1500 + 300, capacityUsed: 5, paidOptionIds: ['card'] });
  });
  it('enforces capacity', () => {
    expect(priceCustomBasket(base, items, opts, { baseId: 'b', lines: [{ componentId: 'c', quantity: 4 }], optionIds: [] })).toEqual({ ok: false, error: 'capacity' });
    const ok = priceCustomBasket(base, items, opts, { baseId: 'b', lines: [{ componentId: 'c', quantity: 3 }], optionIds: [] });
    expect(ok).toMatchObject({ ok: true, unitCents: 5000, capacityUsed: 6 });
  });
  it('does not double charge included packaging and rejects unknown ids / duplicates', () => {
    const r = priceCustomBasket(base, items, opts, { baseId: 'b', lines: [{ componentId: 'c', quantity: 1 }], optionIds: ['ribbon'] });
    expect(r).toMatchObject({ ok: true, unitCents: 3000, paidOptionIds: [], includedOptionIds: ['ribbon'] });
    expect(priceCustomBasket(base, items, opts, { baseId: 'b', lines: [{ componentId: 'zzz', quantity: 1 }], optionIds: [] })).toEqual({ ok: false, error: 'invalid' });
    expect(priceCustomBasket(base, items, opts, { baseId: 'b', lines: [{ componentId: 'c', quantity: 1 }, { componentId: 'c', quantity: 1 }], optionIds: [] })).toEqual({ ok: false, error: 'invalid' });
  });
});

describe('taxes & delivery fee', () => {
  const t = { mode: 'gst_qst' as const, gstRatePct: 5, qstRatePct: 9.975, customRatePct: 0, customLabel: '', applyToDelivery: true };
  it('is configurable and never assumes registration', () => {
    expect(computeTaxes(10000, 500, { ...t, mode: 'none' })).toEqual([]);
    expect(computeTaxes(10000, 500, t)).toEqual([{ label: 'GST', cents: 525 }, { label: 'QST', cents: 1047 }]);
    expect(computeTaxes(10000, 500, { ...t, applyToDelivery: false })).toEqual([{ label: 'GST', cents: 500 }, { label: 'QST', cents: 998 }]);
  });
  it('free delivery threshold', () => {
    expect(deliveryFee({ feeCents: 500, freeThresholdCents: 15000 }, 14999)).toBe(500);
    expect(deliveryFee({ feeCents: 500, freeThresholdCents: 15000 }, 15000)).toBe(0);
    expect(deliveryFee({ feeCents: 500, freeThresholdCents: null }, 99999)).toBe(500);
  });
});

describe('money & i18n', () => {
  it('parses and formats CAD', () => {
    expect(parseCents('12,50')).toBe(1250);
    expect(parseCents('abc')).toBeNull();
    expect(formatMoney(1250, 'en')).toContain('12.50');
    expect(formatMoney(1250, 'fr')).toContain('12,50');
  });
  it('FR and EN dictionaries have identical keys', () => {
    expect(Object.keys(fr).sort()).toEqual(Object.keys(en).sort());
  });
});
