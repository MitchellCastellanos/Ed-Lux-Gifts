import { NextResponse } from 'next/server';
import { z } from 'zod';
import { cartSchema } from '@/lib/cart';
import { quote } from '@/lib/quote';
import { rateLimit, clientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!(await rateLimit(`quote:${clientIp(req.headers)}`, 120, 60))) return NextResponse.json({ error: 'rate' }, { status: 429 });
  const body = await req.json().catch(() => null);
  const parsed = z.object({ cart: cartSchema, postalCode: z.string().max(12).optional() }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid' }, { status: 400 });
  const q = await quote(parsed.data.cart, parsed.data.postalCode);
  return NextResponse.json(q, { headers: { 'Cache-Control': 'no-store' } });
}
