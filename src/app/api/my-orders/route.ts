import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { requestHistoryCode, verifyHistoryCode, endCustomerSession, SESSION_COOKIE, SESSION_TTL_MS } from '@/lib/verification';
import { clientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
const H = { 'Cache-Control': 'no-store' };

export async function POST(req: Request) {
  const body = z.object({ action: z.enum(['request', 'verify', 'logout']), phone: z.string().max(40).optional(), email: z.string().max(160).optional(), code: z.string().max(10).optional(), locale: z.enum(['fr', 'en']).optional() }).safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ ok: false }, { status: 400, headers: H });
  const d = body.data;
  const ip = clientIp(req.headers);
  const jar = await cookies();
  if (d.action === 'logout') {
    await endCustomerSession(jar.get(SESSION_COOKIE)?.value);
    jar.delete(SESSION_COOKIE);
    return NextResponse.json({ ok: true }, { headers: H });
  }
  if (d.action === 'request') {
    const r = await requestHistoryCode(d.phone ?? '', d.email ?? '', ip, d.locale ?? 'fr');
    return NextResponse.json(r.ok ? { ok: true, devCode: r.devCode } : { ok: false, reason: r.reason }, { status: r.ok ? 200 : r.reason === 'rate' ? 429 : 200, headers: H });
  }
  const v = await verifyHistoryCode(d.phone ?? '', d.email ?? '', d.code ?? '', ip);
  if (!v.ok) return NextResponse.json({ ok: false }, { headers: H });
  jar.set(SESSION_COOKIE, v.token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: SESSION_TTL_MS / 1000 });
  return NextResponse.json({ ok: true }, { headers: H });
}
