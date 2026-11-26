import { Gift } from 'lucide-react';

export function Monogram({ size = 46 }: { size?: number }) {
  return (
    <span aria-hidden className="relative inline-block select-none font-script leading-none text-gold" style={{ fontSize: size, width: size * 1.25, height: size * 0.95 }}>
      <span className="absolute left-0 top-0">E</span>
      <span className="absolute left-[0.38em] top-[0.06em] opacity-90">D</span>
    </span>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <Monogram size={compact ? 36 : 44} />
      <span className="flex flex-col items-center">
        <span className="font-display text-[15px] font-medium uppercase leading-none tracking-[0.1em] text-gold min-[380px]:text-[17px] sm:text-[22px] sm:tracking-[0.14em]">ED LUX GIFTS</span>
        <span className="mt-1.5 flex w-full items-center gap-2 text-gold">
          <span className="h-px flex-1 bg-gold/70" />
          <Gift aria-hidden size={11} strokeWidth={1.8} />
          <span className="h-px flex-1 bg-gold/70" />
        </span>
      </span>
    </span>
  );
}
