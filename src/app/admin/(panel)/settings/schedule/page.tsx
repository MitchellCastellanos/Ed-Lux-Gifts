import { getT } from '@/i18n/server';
import { getSettings } from '@/lib/settings';
import { weekdayName, candidateDates, groupByCycle, formatDate } from '@/lib/schedule';
import { Toggle, SubmitButton, Flash } from '@/components/admin/ui';
import { saveSchedule, setWeekendClosed } from '../../../actions';

export default async function ScheduleSettings({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const { t, locale } = await getT();
  const s = (await getSettings()).schedule;
  const card = 'space-y-4 rounded-lg border border-gold-line bg-white p-5';
  const cycles = groupByCycle(candidateDates(new Date(), { ...s, ordersOpen: true, closedDates: [] }).map((d) => d.date), s);
  return (
    <div className="max-w-3xl space-y-6"><Flash ok={sp.ok} error={sp.error} />
      <section className={card}><h2 className="font-display text-xl font-semibold">{t('a.schedule.weekends')}</h2><p className="text-sm text-muted">{t('a.schedule.weekendsHelp')}</p>
        <ul className="divide-y divide-gold-line/60">{cycles.map((g) => { const closed = g.every((d) => s.closedDates.includes(d)); return (
          <li key={g[0]} className="flex flex-wrap items-center gap-3 py-2.5"><span className="flex-1 capitalize">{g.map((d) => formatDate(d, locale, { weekday: 'short', day: 'numeric', month: 'short' })).join(' · ')}</span>
            <span className={`badge ${closed ? 'border-red-300 bg-red-50 text-red-900' : 'border-emerald/40 bg-emerald-soft text-emerald'}`}>{closed ? t('a.schedule.closed') : t('a.schedule.openW')}</span>
            <form action={setWeekendClosed}><input type="hidden" name="dates" value={g.join('\n')} /><input type="hidden" name="close" value={String(!closed)} /><input type="hidden" name="back" value="/admin/settings/schedule" /><button className="btn-outline btn-sm">{closed ? t('a.schedule.reopen') : t('a.schedule.close')}</button></form></li>); })}</ul></section>
      <form action={saveSchedule} className="space-y-6">
        <section className={card}><h2 className="font-display text-xl font-semibold">{t('a.tab.schedule')}</h2>
          <Toggle name="ordersOpen" label={t('a.schedule.ordersOpen')} defaultChecked={s.ordersOpen} hint={t('a.schedule.ordersOpenHelp')} />
          <div className="grid gap-4 sm:grid-cols-2"><div><label className="label" htmlFor="cd">{t('a.schedule.cutoffDay')}</label><select id="cd" name="cutoffDay" defaultValue={s.cutoffDay} className="input">{[1, 2, 3, 4, 5, 6, 0].map((d) => <option key={d} value={d}>{weekdayName(d, locale)}</option>)}</select></div>
            <div><label className="label" htmlFor="ct">{t('a.schedule.cutoffTime')}</label><input id="ct" name="cutoffTime" type="time" defaultValue={s.cutoffTime} className="input" /></div></div>
          <fieldset><legend className="label">{t('a.schedule.deliveryDays')}</legend><div className="flex flex-wrap gap-x-6">{[1, 2, 3, 4, 5, 6, 0].map((d) => <label key={d} className="flex items-center gap-2 py-1"><input type="checkbox" name="days" value={d} defaultChecked={s.deliveryDays.includes(d)} className="h-5 w-5 accent-emerald" /><span className="capitalize">{weekdayName(d, locale)}</span></label>)}</div></fieldset>
          <div className="grid gap-4 sm:grid-cols-2"><div><label className="label" htmlFor="wk">{t('a.schedule.weeks')}</label><input id="wk" name="weeks" type="number" min={1} max={12} defaultValue={s.maxAdvanceWeeks} className="input" /></div>
            <div><label className="label" htmlFor="mo">{t('a.schedule.maxOrders')}</label><input id="mo" name="maxOrders" type="number" min={0} defaultValue={s.maxOrdersPerDay} className="input" /><p className="hint">{t('a.schedule.maxOrdersHelp')}</p></div></div>
          <div><label className="label" htmlFor="cl">{t('a.schedule.closedDates')}</label><textarea id="cl" name="closedDates" rows={3} defaultValue={s.closedDates.join('\n')} className="input font-mono" placeholder="2026-12-26" /><p className="hint">{t('a.schedule.closedDatesHelp')}</p></div>
          <p className="text-sm text-muted">{t('a.schedule.tz')}</p></section>
        <SubmitButton className="btn-emerald">{t('a.save')}</SubmitButton>
      </form>
    </div>
  );
}
