import { prisma } from './db';
import { priceCart, type CartItem, type PricedCart } from './cart';
import { getSettings } from './settings';
import { normalizePostalCode } from './postal';
import { computeTaxes, deliveryFee, type TaxLine } from './pricing';
import { findZone } from './orders';
import { candidateDates, type DateStatus } from './schedule';

export type Quote = {
  priced: PricedCart;
  zone: { name: string } | null;
  postal: 'none' | 'invalid' | 'unsupported' | 'ok';
  deliveryFeeCents: number | null;
  taxLines: TaxLine[];
  taxCents: number;
  totalCents: number | null;
  taxMode: string;
};

export async function quote(cart: CartItem[], postalInput?: string): Promise<Quote> {
  const [priced, settings] = await Promise.all([priceCart(cart), getSettings()]);
  let zone: Quote['zone'] = null;
  let fee: number | null = null;
  let postal: Quote['postal'] = 'none';
  if (postalInput && postalInput.trim()) {
    const p = normalizePostalCode(postalInput);
    if (!p) postal = 'invalid';
    else {
      const z = await findZone(p);
      if (!z) postal = 'unsupported';
      else { postal = 'ok'; zone = { name: z.name }; fee = deliveryFee(z, priced.subtotalCents); }
    }
  }
  const taxLines = computeTaxes(priced.subtotalCents, fee ?? 0, settings.tax);
  const taxCents = taxLines.reduce((s, t) => s + t.cents, 0);
  return { priced, zone, postal, deliveryFeeCents: fee, taxLines, taxCents, totalCents: fee == null ? null : priced.subtotalCents + fee + taxCents, taxMode: settings.tax.mode };
}

export type DeliveryOption = { date: string; status: DateStatus; full: boolean };

/** Delivery dates in the booking window with status and whether the day is at capacity. */
export async function deliveryOptions(now = new Date()): Promise<{ options: DeliveryOption[]; paused: boolean }> {
  const s = await getSettings();
  const isDemo = s.store.mode === 'demo';
  const dates = candidateDates(now, s.schedule);
  const counts = await prisma.order.groupBy({ by: ['deliveryDate'], where: { isDemo, fulfillmentStatus: { not: 'CANCELLED' }, deliveryDate: { in: dates.map((d) => d.date) } }, _count: true });
  const cm = new Map(counts.map((c) => [c.deliveryDate, c._count]));
  return {
    paused: !s.schedule.ordersOpen,
    options: dates.map((d) => ({ ...d, full: s.schedule.maxOrdersPerDay > 0 && (cm.get(d.date) ?? 0) >= s.schedule.maxOrdersPerDay })),
  };
}
