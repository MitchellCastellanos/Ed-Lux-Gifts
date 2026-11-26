import { getT } from '@/i18n/server';
import { prisma } from '@/lib/db';
import { loc } from '@/lib/i18n-labels';
import { Flash } from '@/components/admin/ui';
import { InventoryList } from './InventoryList';

export default async function Inventory({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const { locale } = await getT();
  const comps = await prisma.component.findMany({ where: { archived: false }, orderBy: [{ kind: 'asc' }, { nameFr: 'asc' }], include: { adjustments: { orderBy: { createdAt: 'desc' }, take: 5 } } });
  return (<><Flash ok={sp.ok} error={sp.error} /><InventoryList rows={comps.map((c) => ({ id: c.id, name: loc(c, 'name', locale), kind: c.kind, image: c.imageUrl, onHand: c.stockOnHand, reserved: c.stockReserved, low: c.lowStockThreshold, history: c.adjustments.map((a) => ({ delta: a.delta, newOnHand: a.newOnHand, reason: a.reason, at: a.createdAt.toISOString(), actor: a.actor })) }))} /></>);
}
