'use client';
import { useEffect, useState } from 'react';
import type { CartItem } from '@/lib/cart';
import type { Quote } from '@/lib/quote';

export function useQuote(items: CartItem[], ready: boolean, postal: string) {
  const [q, setQ] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const sig = JSON.stringify(items) + '|' + postal;
  useEffect(() => {
    if (!ready) return;
    if (items.length === 0) { setQ(null); setLoading(false); return; }
    const ctl = new AbortController();
    setLoading(true);
    const tm = setTimeout(() => {
      fetch('/api/quote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cart: items, postalCode: postal }), signal: ctl.signal })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((j) => { setQ(j); setError(false); setLoading(false); })
        .catch((e) => { if (e?.name !== 'AbortError') { setError(true); setLoading(false); } });
    }, 250);
    return () => { clearTimeout(tm); ctl.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, ready]);
  return { q, loading, error };
}
