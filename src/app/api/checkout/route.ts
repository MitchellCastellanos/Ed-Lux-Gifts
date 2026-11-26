import { NextResponse } from 'next/server';
import { createOrder } from '@/lib/orders';
import { clientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const origin = new URL(req.url).origin;
  const r = await createOrder(body, { ip: clientIp(req.headers), siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? origin });
  const h = { 'Cache-Control': 'no-store' };
  if (r.ok) return NextResponse.json({ ok: true, number: r.order.number, token: r.order.publicToken }, { headers: h });
  const status = r.error === 'validation' ? 422 : r.error === 'rate' ? 429 : 409;
  return NextResponse.json(r, { status, headers: h });
}
