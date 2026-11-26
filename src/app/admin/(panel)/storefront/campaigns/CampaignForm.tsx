'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/i18n/client';
import { BiField, ImageField, Toggle, SubmitButton } from '@/components/admin/ui';
import { HeroSlide } from '@/components/HeroSlide';
import { saveCampaign } from '../../../actions';
import { ACCENTS } from '@/lib/catalog';

type C = { id?: string; name: string; eyebrowFr: string; eyebrowEn: string; headlineFr: string; headlineEn: string; descFr: string; descEn: string; ctaFr: string; ctaEn: string; taglineFr: string; taglineEn: string; desktopImage: string; mobileImage: string; collectionId: string; accent: string; published: boolean; startsAt: string; endsAt: string };

/** Live preview uses the real hero component, so what the owner sees is what customers get. */
export function CampaignForm({ c, collections }: { c: C; collections: { id: string; name: string; slug: string }[] }) {
  const { t, locale } = useI18n();
  const [v, setV] = useState(c);
  const [lang, setLang] = useState(locale);
  const onChange = (e: React.FormEvent<HTMLFormElement>) => {
    const fd = new FormData(e.currentTarget);
    const g = (k: string) => String(fd.get(k) ?? '');
    setV((p) => ({ ...p, headlineFr: g('headlineFr'), headlineEn: g('headlineEn'), eyebrowFr: g('eyebrowFr'), eyebrowEn: g('eyebrowEn'), descFr: g('descFr'), descEn: g('descEn'), ctaFr: g('ctaFr'), ctaEn: g('ctaEn'), accent: g('accent'), desktopImage: g('desktopImage'), mobileImage: g('mobileImage') }));
  };
  const L = lang === 'fr' ? 'Fr' : 'En';
  const pick = (k: string) => (v as any)[`${k}${L}`] as string;
  return (
    <div className="space-y-6">
      <section aria-label={t('a.campaigns.preview')} className="overflow-hidden rounded-lg border-2 border-gold">
        <div className="flex items-center justify-between bg-champagne px-4 py-2 text-sm"><b>{t('a.campaigns.preview')}</b><div className="flex overflow-hidden rounded border border-emerald/30">{(['fr', 'en'] as const).map((l) => <button key={l} type="button" onClick={() => setLang(l)} className={`px-3 py-1 ${lang === l ? 'bg-emerald text-white' : 'bg-white'}`}>{l.toUpperCase()}</button>)}</div></div>
        <div className="max-h-[460px] overflow-hidden"><HeroSlide s={{ eyebrow: pick('eyebrow'), headline: pick('headline') || '…', description: pick('desc'), cta: pick('cta') || '…', href: '#', desktop: v.desktopImage.split('\n')[0] || null, mobile: null, accent: v.accent, alt: 'preview' }} /></div>
      </section>
      <form action={saveCampaign} onChange={onChange} className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <input type="hidden" name="id" value={c.id ?? ''} />
        <div className="space-y-5 rounded-lg border border-gold-line bg-white p-5">
          <div><label className="label" htmlFor="cname">{t('a.campaigns.name')} *</label><input id="cname" name="name" defaultValue={c.name} required className="input" /><p className="hint">{t('a.campaigns.nameHelp')}</p></div>
          <BiField name="eyebrow" label={t('a.campaigns.eyebrow')} defaultFr={c.eyebrowFr} defaultEn={c.eyebrowEn} />
          <BiField name="headline" label={t('a.campaigns.headline')} defaultFr={c.headlineFr} defaultEn={c.headlineEn} required hint={t('a.campaigns.headlineHelp')} />
          <BiField name="desc" label={t('a.field.description')} defaultFr={c.descFr} defaultEn={c.descEn} textarea rows={2} />
          <BiField name="cta" label={t('a.campaigns.cta')} defaultFr={c.ctaFr} defaultEn={c.ctaEn} />
          <BiField name="tagline" label={t('a.campaigns.tagline')} defaultFr={c.taglineFr} defaultEn={c.taglineEn} hint={t('a.campaigns.taglineHelp')} />
          <ImageField name="desktopImage" label={t('a.campaigns.desktopImage')} defaultValue={c.desktopImage} aspect="12 / 5" wide hint={t('a.campaigns.desktopHelp')} />
          <ImageField name="mobileImage" label={t('a.campaigns.mobileImage')} defaultValue={c.mobileImage} aspect="4 / 5" hint={t('a.campaigns.mobileHelp')} />
        </div>
        <div className="space-y-6">
          <section className="space-y-4 rounded-lg border border-gold-line bg-white p-5">
            <div><label className="label" htmlFor="ccol">{t('a.campaigns.collection')}</label><select id="ccol" name="collectionId" defaultValue={c.collectionId} className="input"><option value="">{t('a.campaigns.allBaskets')}</option>{collections.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}</select><p className="hint">{t('a.campaigns.collectionHelp')}</p></div>
            <fieldset><legend className="label">{t('a.campaigns.accent')}</legend><div className="flex flex-wrap gap-2">{Object.entries(ACCENTS).map(([k, a]) => <label key={k} className="flex cursor-pointer items-center gap-2 rounded border border-gold-line px-2.5 py-1.5 text-sm has-[:checked]:border-emerald has-[:checked]:bg-emerald-soft"><input type="radio" name="accent" value={k} defaultChecked={c.accent === k} className="accent-emerald" /><span aria-hidden className="h-4 w-4 rounded-full border border-black/20" style={{ background: a.hex }} />{locale === 'fr' ? a.label : a.labelEn}</label>)}</div></fieldset>
          </section>
          <section className="space-y-3 rounded-lg border border-gold-line bg-white p-5">
            <Toggle name="published" label={t('a.campaigns.published')} defaultChecked={c.published} hint={t('a.campaigns.publishedHelp')} />
            <details open={!!(c.startsAt || c.endsAt)}><summary className="cursor-pointer text-sm font-medium text-emerald">{t('a.campaigns.dates')}</summary>
              <div className="mt-2 space-y-3"><div><label className="label" htmlFor="sa">{t('a.campaigns.startsAt')}</label><input id="sa" type="datetime-local" name="startsAt" defaultValue={c.startsAt} className="input" /></div><div><label className="label" htmlFor="ea">{t('a.campaigns.endsAt')}</label><input id="ea" type="datetime-local" name="endsAt" defaultValue={c.endsAt} className="input" /></div><p className="hint">{t('a.campaigns.datesHelp')}</p></div></details>
          </section>
          <div className="sticky bottom-20 z-10 flex gap-3 rounded-lg border border-gold-line bg-white/95 p-3 backdrop-blur lg:bottom-4"><SubmitButton className="btn-gold flex-1">{t('a.save')}</SubmitButton><Link href="/admin/storefront/campaigns" className="btn-outline">{t('a.cancel')}</Link></div>
        </div>
      </form>
    </div>
  );
}
