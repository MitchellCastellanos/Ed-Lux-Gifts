import { CircleDot, CheckCircle2, Clock, XCircle, PackageCheck, Truck, Hammer, Banknote, Ban, RotateCcw } from 'lucide-react';
import type { TFn } from '@/i18n';

const F: Record<string, [string, typeof Clock, string]> = {
  NEW: ['status.f.NEW', CircleDot, 'border-blue-300 bg-blue-50 text-blue-900'],
  CONFIRMED: ['status.f.CONFIRMED', CheckCircle2, 'border-emerald/40 bg-emerald-soft text-emerald'],
  PREPARING: ['status.f.PREPARING', Hammer, 'border-amber-400 bg-amber-50 text-amber-900'],
  READY: ['status.f.READY', Truck, 'border-violet-300 bg-violet-50 text-violet-900'],
  DELIVERED: ['status.f.DELIVERED', PackageCheck, 'border-emerald bg-emerald text-white'],
  CANCELLED: ['status.f.CANCELLED', XCircle, 'border-neutral-400 bg-neutral-100 text-neutral-800'],
};
const P: Record<string, [string, typeof Clock, string]> = {
  AWAITING_INTERAC: ['status.p.AWAITING_INTERAC', Clock, 'border-amber-400 bg-amber-50 text-amber-900'],
  DUE_ON_DELIVERY: ['status.p.DUE_ON_DELIVERY', Banknote, 'border-sky-300 bg-sky-50 text-sky-900'],
  PAID: ['status.p.PAID', CheckCircle2, 'border-emerald/40 bg-emerald-soft text-emerald'],
  EXPIRED: ['status.p.EXPIRED', Ban, 'border-red-300 bg-red-50 text-red-900'],
  REFUNDED: ['status.p.REFUNDED', RotateCcw, 'border-neutral-400 bg-neutral-100 text-neutral-800'],
};

export function StatusBadge({ kind, value, t }: { kind: 'f' | 'p'; value: string; t: TFn }) {
  const [key, Icon, cls] = (kind === 'f' ? F : P)[value] ?? [value, CircleDot, 'border-neutral-300'];
  return <span className={`badge whitespace-nowrap ${cls}`}><Icon size={13} aria-hidden /> {t(key)}</span>;
}
