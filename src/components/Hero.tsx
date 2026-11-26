'use client';
import { Children, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useI18n } from '@/i18n/client';

/** Carousel controls only appear when more than one banner is published. */
export function HeroCarousel({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const slides = Children.toArray(children);
  const [i, setI] = useState(0);
  if (slides.length <= 1) return <>{slides[0]}</>;
  const go = (n: number) => setI((n + slides.length) % slides.length);
  return (
    <div className="relative" role="region" aria-roledescription="carousel" aria-label={t('home.heroAria')}>
      <div aria-live="polite">{slides[i]}</div>
      <button type="button" onClick={() => go(i - 1)} aria-label={t('hero.prev')} className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-emerald shadow"><ChevronLeft aria-hidden /></button>
      <button type="button" onClick={() => go(i + 1)} aria-label={t('hero.next')} className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-emerald shadow"><ChevronRight aria-hidden /></button>
      <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2">
        {slides.map((_, n) => (<button key={n} type="button" onClick={() => setI(n)} aria-label={`${n + 1} / ${slides.length}`} aria-current={n === i} className={`h-3 w-3 rounded-full border border-gold ${n === i ? 'bg-gold' : 'bg-transparent'}`} />))}
      </div>
    </div>
  );
}
