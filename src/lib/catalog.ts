import { prisma } from './db';
import type { Prisma } from '@prisma/client';

export const available = (c: { stockOnHand: number; stockReserved: number }) => Math.max(0, c.stockOnHand - c.stockReserved);

export const productInclude = {
  images: { orderBy: { sortOrder: 'asc' } },
  recipe: { include: { component: true } },
  collections: { include: { collection: true } },
} satisfies Prisma.ProductInclude;
export type ProductFull = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

/** How many of this ready-made basket can be fulfilled right now, from its recipe and shared stock. */
export function productStock(p: Pick<ProductFull, 'recipe'>): number {
  if (!p.recipe.length) return 0;
  let min = Infinity;
  for (const r of p.recipe) {
    if (!r.component.active || r.component.archived) return 0;
    min = Math.min(min, Math.floor(available(r.component) / r.quantity));
  }
  return min === Infinity ? 0 : min;
}

export async function activeProducts(opts: { collectionSlug?: string; featured?: boolean; take?: number } = {}) {
  const where: Prisma.ProductWhereInput = { active: true, archived: false };
  if (opts.featured) where.featured = true;
  if (opts.collectionSlug) where.collections = { some: { collection: { slug: opts.collectionSlug, active: true, archived: false } } };
  const rows = await prisma.product.findMany({ where, include: productInclude, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }], take: opts.take });
  return rows;
}

/** Collections that are active and contain at least one active product. */
export async function visibleCollections() {
  const rows = await prisma.collection.findMany({
    where: { active: true, archived: false, products: { some: { product: { active: true, archived: false } } } },
    orderBy: { sortOrder: 'asc' },
    include: { _count: { select: { products: true } } },
  });
  return rows;
}

export async function activeCampaigns(now = new Date()) {
  return prisma.campaign.findMany({
    where: { published: true, AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }] },
    include: { collection: true },
    orderBy: { sortOrder: 'asc' },
  });
}

export const ACCENTS: Record<string, { label: string; labelEn: string; hex: string }> = {
  gold: { label: 'Or', labelEn: 'Gold', hex: '#D4A64D' },
  burgundy: { label: 'Bourgogne', labelEn: 'Burgundy', hex: '#8A1730' },
  blush: { label: 'Rose poudré', labelEn: 'Blush', hex: '#D9A3A8' },
  sage: { label: 'Sauge', labelEn: 'Sage', hex: '#9DB59A' },
  champagne: { label: 'Champagne', labelEn: 'Champagne', hex: '#F2E6D4' },
};
