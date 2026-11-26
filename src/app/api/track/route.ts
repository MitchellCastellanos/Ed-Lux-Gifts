import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requestOrderCode, verifyOrderCode } from '@/lib/verification';
import { clientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
const H = { 'Cache-Control': 'no-store' };

/** POST {action:'request', orderNumber, phone, locale} | {action:'verify', orderNumber, phone, code} — responses are intentionally generic. */
export async function POST(req: Request) {
  const body = z.object({ action: z.enum(['request', 'verify']), orderNumber: z.string().max(30), phone: z.string().max(40), code: z.string().max(10).optional(), locale: z.enum(['fr', 'en']).optional() }).safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ ok: false }, { status: 400, headers: H });
  const ip = clientIp(req.headers);
  if (body.data.action === 'request') {
    const r = await requestOrderCode(body.data.orderNumber, body.data.phone, ip, body.data.locale ?? 'fr');
    return NextResponse.json(r.ok ? { ok: true, devCode: r.devCode } : { ok: false, reason: r.reason }, { status: r.ok ? 200 : r.reason === 'rate' ? 429 : 200, headers: H });
  }
  const v = await verifyOrderCode(body.data.orderNumber, body.data.phone, body.data.code ?? '', ip);
  return NextResponse.json(v.ok ? { ok: true, token: v.publicToken } : { ok: false }, { headers: H });
}
