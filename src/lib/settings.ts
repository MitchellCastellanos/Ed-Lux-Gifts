import { z } from 'zod';
import { prisma } from './db';

const bool = z.boolean();
export const schemas = {
  business: z.object({
    name: z.string().min(1).max(80),
    email: z.string().email().or(z.literal('')),
    phone: z.string().max(40),
    addressLine: z.string().max(160),
    city: z.string().max(80),
    postalCode: z.string().max(10),
    instagram: z.string().max(200),
    facebook: z.string().max(200),
    aboutFr: z.string().max(2000),
    aboutEn: z.string().max(2000),
    hoursFr: z.string().max(300),
    hoursEn: z.string().max(300),
    verified: bool, // owner confirmed real business details (enables LocalBusiness structured data)
  }),
  payments: z.object({
    interacEnabled: bool,
    interacEmail: z.string().max(120),
    interacInstructionsFr: z.string().max(600),
    interacInstructionsEn: z.string().max(600),
    interacDeadlineHours: z.number().int().min(1).max(24 * 14),
    codEnabled: bool,
    codCash: bool,
    codInterac: bool,
  }),
  schedule: z.object({
    ordersOpen: bool,
    cutoffDay: z.number().int().min(0).max(6),
    cutoffTime: z.string().regex(/^\d{2}:\d{2}$/),
    deliveryDays: z.array(z.number().int().min(0).max(6)).min(1),
    maxAdvanceWeeks: z.number().int().min(1).max(12),
    maxOrdersPerDay: z.number().int().min(0).max(500),
    closedDates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  }),
  tax: z.object({
    mode: z.enum(['none', 'gst_qst', 'custom']),
    gstRatePct: z.number().min(0).max(30),
    qstRatePct: z.number().min(0).max(30),
    customRatePct: z.number().min(0).max(30),
    customLabel: z.string().max(30),
    applyToDelivery: bool,
    confirmedByOwner: bool,
  }),
  store: z.object({
    mode: z.enum(['demo', 'live']),
    onboarding: z.record(z.string(), z.boolean()),
  }),
  email: z.object({
    senderName: z.string().max(80),
    replyTo: z.string().email().or(z.literal('')),
    historyVerificationTested: bool,
  }),
  retention: z.object({
    orderRetentionMonths: z.number().int().min(12).max(120),
  }),
} as const;

export type SettingsMap = { [K in keyof typeof schemas]: z.infer<(typeof schemas)[K]> };
export type SettingKey = keyof SettingsMap;

export const defaults: SettingsMap = {
  business: {
    name: 'ED LUX GIFTS',
    email: 'hello@example.com',
    phone: '(514) 555-0100',
    addressLine: '',
    city: 'Pointe-Claire, QC',
    postalCode: '',
    instagram: '',
    facebook: '',
    aboutFr: 'ED LUX GIFTS compose à la main des paniers-cadeaux élégants à Pointe-Claire. Chaque panier est préparé avec soin, pour que le cadeau fasse vraiment plaisir.',
    aboutEn: 'ED LUX GIFTS hand-assembles elegant gift baskets in Pointe-Claire. Every basket is prepared with care so the gift truly delights.',
    hoursFr: 'Commandes jusqu’au vendredi 13 h — livraison le week-end',
    hoursEn: 'Orders until Friday 1 PM — weekend delivery',
    verified: false,
  },
  payments: {
    interacEnabled: true,
    interacEmail: 'demo-paiements@example.com',
    interacInstructionsFr: 'Envoyez le virement Interac avec le numéro de commande dans le message. Réponse automatique non requise.',
    interacInstructionsEn: 'Send the Interac e-Transfer with the order number in the message. No security question needed.',
    interacDeadlineHours: 48,
    codEnabled: true,
    codCash: true,
    codInterac: true,
  },
  schedule: {
    ordersOpen: true,
    cutoffDay: 5,
    cutoffTime: '13:00',
    deliveryDays: [6, 0],
    maxAdvanceWeeks: 3,
    maxOrdersPerDay: 12,
    closedDates: [],
  },
  tax: {
    mode: 'none',
    gstRatePct: 5,
    qstRatePct: 9.975,
    customRatePct: 0,
    customLabel: 'Tax',
    applyToDelivery: true,
    confirmedByOwner: false,
  },
  store: { mode: 'demo', onboarding: {} },
  email: { senderName: 'ED LUX GIFTS', replyTo: '', historyVerificationTested: false },
  retention: { orderRetentionMonths: 84 },
};

export async function getSettings(): Promise<SettingsMap> {
  const rows = await prisma.setting.findMany();
  const out: any = { ...defaults };
  for (const r of rows) {
    const k = r.key as SettingKey;
    if (schemas[k]) {
      const merged = { ...(defaults as any)[k], ...(r.value as object) };
      const parsed = (schemas[k] as z.ZodTypeAny).safeParse(merged);
      out[k] = parsed.success ? parsed.data : (defaults as any)[k];
    }
  }
  return out;
}

export async function saveSetting<K extends SettingKey>(key: K, value: SettingsMap[K]) {
  const parsed = (schemas[key] as z.ZodTypeAny).parse(value);
  await prisma.setting.upsert({ where: { key }, create: { key, value: parsed }, update: { value: parsed } });
}

export async function patchSetting<K extends SettingKey>(key: K, patch: Partial<SettingsMap[K]>) {
  const cur = (await getSettings())[key];
  await saveSetting(key, { ...cur, ...patch } as SettingsMap[K]);
}

export const isFictionalEmail = (e: string) => /@example\.(com|org|net)$/i.test(e.trim()) || e.trim() === '';
