import { getT } from '@/i18n/server';
import { prisma } from '@/lib/db';
import { getSettings } from '@/lib/settings';
import { centsToInput } from '@/lib/money';
import { Toggle, SubmitButton, Flash, ConfirmButton } from '@/components/admin/ui';
import { saveZone, deleteZone } from '../../../actions';

export default async function DeliverySettings({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const { t, locale } = await getT();
  const [zones, s] = await Promise.all([prisma.deliveryZone.findMany({ orderBy: { sortOrder: 'asc' }, include: { prefixes: true, _count: { select: { orders: true } } } }), getSettings()]);
  const ZoneForm = ({ z }: { z?: (typeof zones)[number] }) => (
    <form action={saveZone} className={`space-y-4 rounded-lg border bg-white p-5 ${z ? 'border-gold-line' : 'border-2 border-dashed border-gold'}`}>
      <input type="hidden" name="id" value={z?.id ?? ''} />
      <h2 className="font-display text-xl font-semibold">{z ? z.name : t('a.zones.add')}</h2>
      <div className="grid gap-4 sm:grid-cols-[1fr_140px_180px]">
        <div><label className="label" htmlFor={`n${z?.id}`}>{t('a.zones.name')}</label><input id={`n${z?.id}`} name="name" defaultValue={z?.name} required className="input" /></div>
        <div><label className="label" htmlFor={`f${z?.id}`}>{t('a.zones.fee')}</label><input id={`f${z?.id}`} name="fee" inputMode="decimal" defaultValue={centsToInput(z?.feeCents ?? 0, locale)} className="input" /></div>
        <div><label className="label" htmlFor={`t${z?.id}`}>{t('a.zones.free')}</label><input id={`t${z?.id}`} name="free" inputMode="decimal" defaultValue={z?.freeThresholdCents ? centsToInput(z.freeThresholdCents, locale) : ''} placeholder="—" className="input" /></div>
      </div>
      <div><label className="label" htmlFor={`a${z?.id}`}>{t('a.zones.areas')}</label><input id={`a${z?.id}`} name="areas" defaultValue={z?.areas} className="input" /><p className="hint">{t('a.zones.areasHelp')}</p></div>
      <div><label className="label" htmlFor={`p${z?.id}`}>{t('a.zones.prefixes')}</label><textarea id={`p${z?.id}`} name="prefixes" rows={2} defaultValue={z?.prefixes.map((p) => p.prefix).sort().join(', ')} className="input uppercase" /><p className="hint">{t('a.zones.prefixesHelp')}</p></div>
      <div className="flex flex-wrap gap-x-8"><Toggle name="active" label={t('a.zones.active')} defaultChecked={z?.active ?? true} /><Toggle name="verified" label={t('a.zones.verified')} defaultChecked={z?.verified ?? false} hint={t('a.zones.verifiedHelp')} /></div>
      <div className="flex flex-wrap items-center gap-3"><SubmitButton>{z ? t('a.save') : t('a.zones.add')}</SubmitButton>
        {z && <ConfirmButton className="btn-ghost btn-sm text-danger" title={t('a.delete')} text={t('a.zones.deleteConfirm', { n: z._count.orders })} confirmLabel={t('a.delete')} formAction={async () => { 'use server'; const fd = new FormData(); fd.set('id', z.id); await deleteZone(fd); }}>{t('a.delete')}</ConfirmButton>}</div>
    </form>
  );
  let errText = '';
  if (sp.error?.startsWith('conflict:')) { const [, p, name] = sp.error.split(':'); errText = t('a.zones.conflict', { prefix: p, zone: name }); }
  else if (sp.error?.startsWith('prefix:')) errText = t('a.zones.badPrefix', { prefix: sp.error.split(':')[1] });
  return (
    <div className="max-w-3xl space-y-5">
      <Flash ok={sp.ok} error={errText ? undefined : sp.error} />
      {errText && <p role="alert" className="rounded border border-red-300 bg-red-50 px-4 py-3 font-medium text-red-900">{errText}</p>}
      <p className="text-muted">{t('a.zones.help')}</p>
      {s.store.mode === 'demo' && zones.some((z) => !z.verified) && <p className="rounded bg-amber-50 px-4 py-3 text-sm text-amber-950">{t('a.zones.demoWarn')}</p>}
      {zones.map((z) => <ZoneForm key={z.id} z={z} />)}
      <ZoneForm />
    </div>
  );
}
