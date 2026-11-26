import { z } from 'zod';
import { prisma } from './db';
import { priceCustomBasket, type ItemInfo, type OptionInfo } from './pricing';

const gift = z.string().max(400).optional().default('');
export const cartItemSchema = z.discriminatedUnion('kind', [
  z.object({
    id: z.string().min(1).max(60),
    kind: z.literal('READY'),
    productId: z.string().uuid(),
    quantity: z.number().int().min(1).max(20),
    giftMessage: gift,
    seenUnitCents: z.number().int().optional(),
  }),
  z.object({
    id: z.string().min(1).max(60),
    kind: z.literal('CUSTOM'),
    baseId: z.string().uuid(),
    lines: z.array(z.object({ componentId: z.string().uuid(), quantity: z.number().int().min(1).max(50) })).max(60),
    optionIds: z.array(z.string().uuid()).max(20),
    quantity: z.number().int().min(1).max(20),
    giftMessage: gift,
    seenUnitCents: z.number().int().optional(),
  }),
]);
export type CartItem = z.infer<typeof cartItemSchema>;
export const cartSchema = z.array(cartItemSchema).min(1).max(30);

export type ContentLine = { nameFr: string; nameEn: string; quantity: number; priceCents?: number; paid?: boolean; included?: boolean; kind?: string };

export type PricedItem = {
  id: string;
  kind: 'READY' | 'CUSTOM';
  productId: string | null;
  slug?: string;
  nameFr: string;
  nameEn: string;
  imageUrl: string | null;
  quantity: number;
  unitCents: number;
  lineCents: number;
  giftMessage: string;
  contents: ContentLine[];
  /** unit-level component needs: componentId -> qty for ONE basket */
  needs: Record<string, number>;
  issues: ('unavailable' | 'invalid' | 'capacity' | 'insufficient')[];
  priceChanged: boolean;
};

export type PricedCart = { items: PricedItem[]; subtotalCents: number; needs: Record<string, number>; ok: boolean };

const avail = (c: { stockOnHand: number; stockReserved: number }) => Math.max(0, c.stockOnHand - c.stockReserved);

export async function priceCart(cart: CartItem[]): Promise<PricedCart> {
  const productIds = [...new Set(cart.filter((c) => c.kind === 'READY').map((c: any) => c.productId as string))];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 }, recipe: { include: { component: true } } },
  });
  const pMap = new Map(products.map((p) => [p.id, p]));
  const customIds = new Set<string>();
  for (const c of cart) if (c.kind === 'CUSTOM') {
    customIds.add(c.baseId);
    c.lines.forEach((l) => customIds.add(l.componentId));
    c.optionIds.forEach((o) => customIds.add(o));
  }
  const comps = await prisma.component.findMany({ where: { id: { in: [...customIds] }, archived: false, active: true } });
  const cMap = new Map(comps.map((c) => [c.id, c]));
  // options auto-included by a base must be loaded too
  const extraIds = new Set<string>();
  for (const c of comps) if (c.kind === 'BASE') c.includedOptionIds.forEach((i) => !cMap.has(i) && extraIds.add(i));
  if (extraIds.size) for (const c of await prisma.component.findMany({ where: { id: { in: [...extraIds] }, archived: false } })) cMap.set(c.id, c);

  const items: PricedItem[] = [];
  for (const ci of cart) {
    const base: Omit<PricedItem, 'unitCents' | 'lineCents' | 'contents' | 'needs' | 'issues' | 'priceChanged' | 'productId' | 'nameFr' | 'nameEn' | 'imageUrl'> = {
      id: ci.id, kind: ci.kind, quantity: ci.quantity, giftMessage: (ci.giftMessage ?? '').trim(),
    };
    if (ci.kind === 'READY') {
      const p = pMap.get(ci.productId);
      if (!p || !p.active || p.archived) {
        items.push({ ...base, productId: ci.productId, nameFr: 'Panier indisponible', nameEn: 'Unavailable basket', imageUrl: null, unitCents: 0, lineCents: 0, contents: [], needs: {}, issues: ['unavailable'], priceChanged: false });
        continue;
      }
      const needs: Record<string, number> = {};
      const contents: ContentLine[] = [];
      const issues: PricedItem['issues'] = [];
      for (const r of p.recipe) {
        needs[r.componentId] = (needs[r.componentId] ?? 0) + r.quantity;
        if (r.component.kind !== 'BASE') contents.push({ nameFr: r.component.nameFr, nameEn: r.component.nameEn, quantity: r.quantity, kind: r.component.kind });
        if (!r.component.active || r.component.archived) issues.push('unavailable');
      }
      items.push({ ...base, productId: p.id, slug: p.slug, nameFr: p.nameFr, nameEn: p.nameEn, imageUrl: p.images[0]?.url ?? null, unitCents: p.priceCents, lineCents: p.priceCents * ci.quantity, contents, needs, issues, priceChanged: ci.seenUnitCents != null && ci.seenUnitCents !== p.priceCents });
    } else {
      const b = cMap.get(ci.baseId);
      const items0 = new Map<string, ItemInfo>();
      const opts = new Map<string, OptionInfo>();
      for (const l of ci.lines) {
        const c = cMap.get(l.componentId);
        if (c && c.kind === 'ITEM' && c.customEligible) items0.set(c.id, { id: c.id, priceCents: c.priceCents, capacityCost: c.capacityCost });
      }
      const allOptIds = new Set([...ci.optionIds, ...(b?.includedOptionIds ?? [])]);
      for (const id of allOptIds) {
        const c = cMap.get(id);
        if (c && c.kind === 'PRESENTATION') opts.set(c.id, { id: c.id, priceCents: c.priceCents });
      }
      if (!b || b.kind !== 'BASE') {
        items.push({ ...base, productId: null, nameFr: 'Panier personnalisé', nameEn: 'Custom basket', imageUrl: null, unitCents: 0, lineCents: 0, contents: [], needs: {}, issues: ['unavailable'], priceChanged: false });
        continue;
      }
      const res = priceCustomBasket({ id: b.id, priceCents: b.priceCents, capacity: b.capacity, includedOptionIds: b.includedOptionIds }, items0, opts, { baseId: b.id, lines: ci.lines, optionIds: ci.optionIds });
      const nameFr = `Panier personnalisé — ${b.nameFr}`;
      const nameEn = `Custom basket — ${b.nameEn}`;
      if (!res.ok) {
        items.push({ ...base, productId: null, nameFr, nameEn, imageUrl: b.imageUrl, unitCents: 0, lineCents: 0, contents: [], needs: {}, issues: [res.error === 'capacity' ? 'capacity' : 'invalid'], priceChanged: false });
        continue;
      }
      const needs: Record<string, number> = { [b.id]: 1 };
      const contents: ContentLine[] = [];
      for (const l of ci.lines) {
        const c = cMap.get(l.componentId)!;
        needs[c.id] = (needs[c.id] ?? 0) + l.quantity;
        contents.push({ nameFr: c.nameFr, nameEn: c.nameEn, quantity: l.quantity, priceCents: c.priceCents, kind: 'ITEM' });
      }
      for (const id of [...res.includedOptionIds, ...res.paidOptionIds]) {
        const c = cMap.get(id)!;
        needs[c.id] = (needs[c.id] ?? 0) + 1;
        const paid = res.paidOptionIds.includes(id);
        contents.push({ nameFr: c.nameFr, nameEn: c.nameEn, quantity: 1, priceCents: paid ? c.priceCents : 0, paid, included: !paid, kind: 'PRESENTATION' });
      }
      items.push({ ...base, productId: null, nameFr, nameEn, imageUrl: b.imageUrl, unitCents: res.unitCents, lineCents: res.unitCents * ci.quantity, contents, needs, issues: [], priceChanged: ci.seenUnitCents != null && ci.seenUnitCents !== res.unitCents });
    }
  }

  // aggregate needs across the whole cart and compare with *available* stock
  const needs: Record<string, number> = {};
  for (const it of items) for (const [id, q] of Object.entries(it.needs)) needs[id] = (needs[id] ?? 0) + q * it.quantity;
  const ids = Object.keys(needs);
  const stock = await prisma.component.findMany({ where: { id: { in: ids } } });
  const sMap = new Map(stock.map((c) => [c.id, c]));
  const short = new Set(ids.filter((id) => { const c = sMap.get(id); return !c || needs[id] > avail(c); }));
  for (const it of items) if (Object.keys(it.needs).some((id) => short.has(id)) && !it.issues.includes('insufficient')) it.issues.push('insufficient');
  const subtotalCents = items.reduce((s, i) => s + i.lineCents, 0);
  return { items, subtotalCents, needs, ok: items.every((i) => i.issues.length === 0) };
}
