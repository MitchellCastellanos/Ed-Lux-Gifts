import Link from 'next/link';
import { Gift, ArrowRight } from 'lucide-react';
import { ACCENTS } from '@/lib/catalog';

export function renderHeadline(s: string, accent: string) {
  return s.split(/(\*[^*]+\*)/g).map((part, i) =>
    part.startsWith('*') && part.endsWith('*') ? <span key={i} className="font-script text-[1.35em] font-normal not-italic leading-[0.8]" style={{ color: accent }}>{part.slice(1, -1)}</span> : <span key={i}>{part}</span>,
  );
}

export type SlideData = { eyebrow: string; headline: string; description: string; cta: string; href: string; desktop: string | null; mobile: string | null; accent: string; alt: string };

export function HeroSlide({ s, eager }: { s: SlideData; eager?: boolean }) {
  const accent = ACCENTS[s.accent]?.hex ?? ACCENTS.gold.hex;
  return (
    <section className="on-dark relative isolate overflow-hidden bg-emerald-dark text-white" aria-label={s.alt}>
      <picture>
        {s.mobile && <source media="(max-width: 767px)" srcSet={s.mobile} />}
        {s.desktop && <img src={s.desktop} alt="" loading={eager ? 'eager' : 'lazy'} fetchPriority={eager ? 'high' : 'auto'} className="absolute inset-0 -z-20 h-full w-full object-cover object-[75%_center] md:object-right" />}
      </picture>
      {/* readability overlay: solid emerald on the text side, transparent on the photo side */}
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-emerald-dark/90 via-emerald-dark/60 to-emerald-dark/10 md:bg-gradient-to-r md:from-emerald-dark/95 md:via-emerald-dark/70 md:to-transparent" />
      <div className="container-page flex min-h-[560px] items-start py-10 md:min-h-[430px] md:items-center lg:min-h-[440px]">
        <div className="max-w-[560px]">
          <p className="eyebrow flex items-center gap-3 text-gold-light"><span aria-hidden className="h-px w-8 bg-gold" /><Gift size={16} aria-hidden /><span>{s.eyebrow}</span></p>
          <h1 className="mt-4 text-balance font-display text-[42px] font-medium italic leading-[1.05] text-white sm:text-[56px] lg:text-[64px]">{renderHeadline(s.headline, accent)}</h1>
          <p className="mt-5 max-w-[440px] text-[18px] leading-snug text-white/95">{s.description}</p>
          <Link href={s.href} className="btn-gold mt-7 !px-6 text-[17px]">{s.cta} <ArrowRight size={18} aria-hidden /></Link>
        </div>
      </div>
    </section>
  );
}
