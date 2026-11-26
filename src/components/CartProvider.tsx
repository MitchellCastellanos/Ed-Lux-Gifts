'use client';
import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import type { CartItem } from '@/lib/cart';

const KEY = 'edl_cart_v1';
type CartCtx = {
  items: CartItem[];
  count: number;
  ready: boolean;
  add: (i: CartItem) => void;
  setQty: (id: string, q: number) => void;
  setGift: (id: string, m: string) => void;
  remove: (id: string) => void;
  replace: (items: CartItem[]) => void;
  clear: () => void;
};
const Ctx = createContext<CartCtx>(null as any);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
    setReady(true);
    const onStorage = (e: StorageEvent) => { if (e.key === KEY) try { setItems(JSON.parse(e.newValue ?? '[]')); } catch {} };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const persist = useCallback((next: CartItem[]) => {
    setItems(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  }, []);

  const value = useMemo<CartCtx>(() => ({
    items, ready,
    count: items.reduce((s, i) => s + i.quantity, 0),
    add: (i) => {
      // merge identical ready-made baskets (same product + same gift message)
      const same = i.kind === 'READY' ? items.find((x) => x.kind === 'READY' && x.productId === i.productId && (x.giftMessage ?? '') === (i.giftMessage ?? '')) : undefined;
      persist(same ? items.map((x) => (x.id === same.id ? { ...x, quantity: Math.min(20, x.quantity + i.quantity) } : x)) : [...items, i]);
    },
    setQty: (id, q) => persist(items.map((x) => (x.id === id ? { ...x, quantity: Math.max(1, Math.min(20, q)) } : x))),
    setGift: (id, m) => persist(items.map((x) => (x.id === id ? { ...x, giftMessage: m } : x))),
    remove: (id) => persist(items.filter((x) => x.id !== id)),
    replace: persist,
    clear: () => persist([]),
  }), [items, ready, persist]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useCart = () => useContext(Ctx);
export const newId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Math.random()).slice(2));
