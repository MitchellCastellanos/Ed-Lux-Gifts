export type BaseInfo = { id: string; priceCents: number; capacity: number; includedOptionIds: string[] };
export type ItemInfo = { id: string; priceCents: number; capacityCost: number };
export type OptionInfo = { id: string; priceCents: number };

export type CustomConfig = {
  baseId: string;
  lines: { componentId: string; quantity: number }[];
  optionIds: string[];
};

export type CustomResult =
  | { ok: true; unitCents: number; capacityUsed: number; paidOptionIds: string[]; includedOptionIds: string[] }
  | { ok: false; error: 'capacity' | 'invalid' };

/** base price + Σ(item price × qty) + paid presentation options. Included options are free. */
export function priceCustomBasket(base: BaseInfo, items: Map<string, ItemInfo>, options: Map<string, OptionInfo>, cfg: CustomConfig): CustomResult {
  let total = base.priceCents;
  let capacityUsed = 0;
  const seen = new Set<string>();
  for (const l of cfg.lines) {
    if (!Number.isInteger(l.quantity) || l.quantity < 1 || seen.has(l.componentId)) return { ok: false, error: 'invalid' };
    seen.add(l.componentId);
    const it = items.get(l.componentId);
    if (!it) return { ok: false, error: 'invalid' };
    total += it.priceCents * l.quantity;
    capacityUsed += it.capacityCost * l.quantity;
  }
  if (capacityUsed > base.capacity) return { ok: false, error: 'capacity' };
  const paid: string[] = [];
  const included: string[] = [];
  for (const id of new Set(cfg.optionIds)) {
    const o = options.get(id);
    if (!o) return { ok: false, error: 'invalid' };
    if (base.includedOptionIds.includes(id)) included.push(id);
    else {
      paid.push(id);
      total += o.priceCents;
    }
  }
  // included options are always part of the basket even if the customer did not tick them
  for (const id of base.includedOptionIds) if (!included.includes(id) && options.has(id)) included.push(id);
  return { ok: true, unitCents: total, capacityUsed, paidOptionIds: paid, includedOptionIds: included };
}

export type TaxSettings = {
  mode: 'none' | 'gst_qst' | 'custom';
  gstRatePct: number;
  qstRatePct: number;
  customRatePct: number;
  customLabel: string;
  applyToDelivery: boolean;
};

export type TaxLine = { label: string; cents: number };

const round = (n: number) => Math.round(n + Number.EPSILON);

/** Taxes are added on top of the displayed prices (prices are tax-exclusive). Each tax is rounded separately. */
export function computeTaxes(subtotalCents: number, deliveryCents: number, t: TaxSettings): TaxLine[] {
  const base = subtotalCents + (t.applyToDelivery ? deliveryCents : 0);
  if (t.mode === 'none') return [];
  if (t.mode === 'gst_qst') {
    return [
      { label: 'GST', cents: round((base * t.gstRatePct) / 100) },
      { label: 'QST', cents: round((base * t.qstRatePct) / 100) },
    ];
  }
  return [{ label: t.customLabel || 'Tax', cents: round((base * t.customRatePct) / 100) }];
}

export function deliveryFee(zone: { feeCents: number; freeThresholdCents: number | null }, subtotalCents: number): number {
  if (zone.freeThresholdCents != null && subtotalCents >= zone.freeThresholdCents) return 0;
  return zone.feeCents;
}
