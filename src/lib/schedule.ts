export const TZ = 'America/Toronto';

export type ScheduleSettings = {
  ordersOpen: boolean;
  cutoffDay: number; // 0=Sunday … 6=Saturday
  cutoffTime: string; // HH:mm in America/Toronto
  deliveryDays: number[];
  maxAdvanceWeeks: number;
  maxOrdersPerDay: number; // 0 = unlimited
  closedDates: string[]; // YYYY-MM-DD
};

type Parts = { y: number; m: number; d: number; h: number; mi: number; dow: number };

export function zonedParts(date: Date, tz = TZ): Parts {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short' });
  const o: Record<string, string> = {};
  for (const p of f.formatToParts(date)) o[p.type] = p.value;
  const dows = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return { y: +o.year, m: +o.month, d: +o.day, h: +o.hour, mi: +o.minute, dow: dows.indexOf(o.weekday) };
}

/** Convert a wall-clock time in America/Toronto to a UTC instant. */
export function zonedToUtc(y: number, m: number, d: number, h: number, mi: number, tz = TZ): Date {
  let guess = Date.UTC(y, m - 1, d, h, mi);
  for (let i = 0; i < 2; i++) {
    const p = zonedParts(new Date(guess), tz);
    const asUtc = Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi);
    guess += Date.UTC(y, m - 1, d, h, mi) - asUtc;
  }
  return new Date(guess);
}

export function ymd(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function businessToday(now: Date): string {
  const p = zonedParts(now);
  return ymd(p.y, p.m, p.d);
}

function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return ymd(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

export function dayOfWeek(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Order cutoff instant for a delivery date: the latest cutoff day/time on or before the end of that date. */
export function cutoffFor(dateStr: string, s: Pick<ScheduleSettings, 'cutoffDay' | 'cutoffTime'>): Date {
  const [hh, mm] = s.cutoffTime.split(':').map(Number);
  const dow = dayOfWeek(dateStr);
  const back = (dow - s.cutoffDay + 7) % 7;
  const cd = addDays(dateStr, -back);
  const [y, m, d] = cd.split('-').map(Number);
  return zonedToUtc(y, m, d, hh, mm);
}

export type DateStatus = 'open' | 'cutoff' | 'closed' | 'too_far' | 'paused' | 'not_delivery_day' | 'past';

export function dateStatus(dateStr: string, now: Date, s: ScheduleSettings): DateStatus {
  if (!s.ordersOpen) return 'paused';
  const today = businessToday(now);
  if (dateStr <= today) return 'past';
  if (!s.deliveryDays.includes(dayOfWeek(dateStr))) return 'not_delivery_day';
  if (dateStr > addDays(today, s.maxAdvanceWeeks * 7)) return 'too_far';
  if (s.closedDates.includes(dateStr)) return 'closed';
  if (now.getTime() >= cutoffFor(dateStr, s).getTime()) return 'cutoff';
  return 'open';
}

/** All delivery dates in the booking window with their status (capacity is checked separately). */
export function candidateDates(now: Date, s: ScheduleSettings): { date: string; status: DateStatus }[] {
  const today = businessToday(now);
  const out: { date: string; status: DateStatus }[] = [];
  for (let i = 1; i <= s.maxAdvanceWeeks * 7; i++) {
    const date = addDays(today, i);
    if (!s.deliveryDays.includes(dayOfWeek(date))) continue;
    out.push({ date, status: dateStatus(date, now, s) });
  }
  return out;
}

/** Group delivery dates into weekends/weeks (consecutive delivery days within the same cutoff cycle). */
export function groupByCycle(dates: string[], s: Pick<ScheduleSettings, 'cutoffDay' | 'cutoffTime'>): string[][] {
  const groups = new Map<number, string[]>();
  for (const d of dates) {
    const k = cutoffFor(d, s).getTime();
    groups.set(k, [...(groups.get(k) ?? []), d]);
  }
  return [...groups.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v.sort());
}

export function formatDate(dateStr: string, locale: 'fr' | 'en', opts: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' }): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Intl.DateTimeFormat(locale === 'fr' ? 'fr-CA' : 'en-CA', { ...opts, timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d)));
}

export function formatDateTime(date: Date, locale: 'fr' | 'en'): string {
  return new Intl.DateTimeFormat(locale === 'fr' ? 'fr-CA' : 'en-CA', { timeZone: TZ, dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];
export function weekdayName(dow: number, locale: 'fr' | 'en') {
  return new Intl.DateTimeFormat(locale === 'fr' ? 'fr-CA' : 'en-CA', { weekday: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2024, 0, 7 + dow)));
}
