import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';

/** Plain <img> wrapper: lazy by default, fixed aspect to prevent layout shift. */
export function Img({ src, alt, className = '', ratio, eager = false, sizes }: { src: string | null | undefined; alt: string; className?: string; ratio?: string; eager?: boolean; sizes?: string }) {
  return (
    <div className={`relative overflow-hidden bg-champagne ${className}`} style={ratio ? { aspectRatio: ratio } : undefined}>
      {src ? <img src={src} alt={alt} loading={eager ? 'eager' : 'lazy'} decoding="async" sizes={sizes} className="absolute inset-0 h-full w-full object-cover" /> : <div className="absolute inset-0 flex items-center justify-center text-muted" role="img" aria-label={alt} />}
    </div>
  );
}

export function SectionTitle({ children, sub, as: Tag = 'h2' }: { children: ReactNode; sub?: ReactNode; as?: 'h1' | 'h2' }) {
  return (
    <div className="mb-8 text-center">
      <div className="flex items-center gap-4 sm:gap-8">
        <span className="gold-rule" aria-hidden />
        <Tag className="max-w-[80%] text-balance font-display text-[28px] font-semibold leading-tight sm:text-[36px]">{children}</Tag>
        <span className="gold-rule" aria-hidden />
      </div>
      <div aria-hidden className="mx-auto mt-2 flex items-center justify-center gap-2 text-gold-deep"><span className="h-px w-10 bg-gold" /><span className="h-1.5 w-1.5 rotate-45 bg-gold" /><span className="h-px w-10 bg-gold" /></div>
      {sub && <p className="mx-auto mt-3 max-w-2xl text-muted">{sub}</p>}
    </div>
  );
}

export function PageHeading({ title, sub, children }: { title: string; sub?: string; children?: ReactNode }) {
  return (
    <div className="border-b border-gold-line/70 bg-champagne/60">
      <div className="container-page py-9 sm:py-12">
        <h1 className="font-display text-[32px] font-semibold leading-tight sm:text-[42px]">{title}</h1>
        {sub && <p className="mt-2 max-w-2xl text-muted">{sub}</p>}
        {children}
      </div>
    </div>
  );
}

export function ArrowLink({ href, children, variant = 'emerald' }: { href: string; children: ReactNode; variant?: 'emerald' | 'gold' | 'outline' }) {
  return (
    <Link href={href} className={variant === 'gold' ? 'btn-gold' : variant === 'outline' ? 'btn-outline' : 'btn-emerald'}>
      {children} <ArrowRight size={17} aria-hidden />
    </Link>
  );
}

export function Notice({ tone = 'info', children, className = '' }: { tone?: 'info' | 'warn' | 'error' | 'ok'; children: ReactNode; className?: string }) {
  const c = { info: 'border-gold-line bg-champagne/60 text-ink', warn: 'border-amber-400 bg-amber-50 text-amber-950', error: 'border-red-300 bg-red-50 text-red-900', ok: 'border-emerald/30 bg-emerald-soft text-emerald' }[tone];
  return <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded border px-4 py-3 text-[15px] ${c} ${className}`}>{children}</div>;
}
