import { prisma } from '@/lib/db';
import { saveSetting, defaults } from '@/lib/settings';

export const WED = new Date('2026-12-02T15:00:00Z'); // Wed 10:00 Toronto
export const SAT = '2026-12-05';
export const SUN = '2026-12-06';

export async function resetDb() {
  await prisma.$executeRawUnsafe(`TRUNCATE "OrderEvent","OrderStockLine","OrderItem","Order","Customer","VerificationCode","CustomerSession","RateLimit","DevEmail","StockAdjustment","ProductComponent","ProductImage","ProductCollection","Product","Campaign","Collection","Component","Category","DeliveryZonePrefix","DeliveryZone","Setting","Counter" RESTART IDENTITY CASCADE`);
  for (const k of Object.keys(defaults) as (keyof typeof defaults)[]) await saveSetting(k, defaults[k] as any);
}

export async function fixtures(opts: { stock?: number } = {}) {
  const stock = opts.stock ?? 10;
  const zone = await prisma.deliveryZone.create({ data: { name: 'Zone A', feeCents: 500, freeThresholdCents: null, prefixes: { create: [{ prefix: 'H9R' }, { prefix: 'H9S' }] } } });
  const ribbon = await prisma.component.create({ data: { kind: 'PRESENTATION', nameFr: 'Ruban', nameEn: 'Ribbon', priceCents: 400, stockOnHand: 100, capacityCost: 0 } });
  const card = await prisma.component.create({ data: { kind: 'PRESENTATION', nameFr: 'Carte', nameEn: 'Card', priceCents: 300, stockOnHand: 100, capacityCost: 0 } });
  const base = await prisma.component.create({ data: { kind: 'BASE', nameFr: 'Panier', nameEn: 'Basket', priceCents: 2000, capacity: 6, stockOnHand: 50, includedOptionIds: [ribbon.id] } });
  const choc = await prisma.component.create({ data: { kind: 'ITEM', nameFr: 'Chocolats', nameEn: 'Chocolates', priceCents: 1000, capacityCost: 2, stockOnHand: stock } });
  const candle = await prisma.component.create({ data: { kind: 'ITEM', nameFr: 'Bougie', nameEn: 'Candle', priceCents: 1500, capacityCost: 3, stockOnHand: 50 } });
  const product = await prisma.product.create({ data: { slug: 'test', nameFr: 'Test', nameEn: 'Test', priceCents: 5000, recipe: { create: [{ componentId: base.id, quantity: 1 }, { componentId: choc.id, quantity: 1 }, { componentId: ribbon.id, quantity: 1 }] } } });
  return { zone, ribbon, card, base, choc, candle, product };
}

let k = 0;
export function checkout(over: Record<string, any> = {}) {
  k++;
  const base: any = {
    cart: [],
    purchaser: { phone: '514-555-0123', name: 'Test Buyer', email: 'buyer@example.com', locale: 'fr' },
    delivery: { address: '1 rue Test', city: 'Pointe-Claire', postalCode: 'h9r 1a1', deliveryDate: SAT, instructions: '', recipientName: '', recipientPhone: '' },
    paymentMethod: 'INTERAC',
    acceptTerms: true,
    idempotencyKey: `test-key-${k}-${Math.random().toString(36).slice(2)}-xxxxxxxx`,
  };
  const out = { ...base, ...over };
  out.purchaser = { ...base.purchaser, ...(over.purchaser ?? {}) };
  out.delivery = { ...base.delivery, ...(over.delivery ?? {}) };
  return out;
}

export const readyItem = (productId: string, quantity = 1) => ({ id: 'i' + Math.random(), kind: 'READY', productId, quantity });
export const customItem = (baseId: string, lines: { componentId: string; quantity: number }[], optionIds: string[] = [], quantity = 1) => ({ id: 'c' + Math.random(), kind: 'CUSTOM', baseId, lines, optionIds, quantity });
