import { NextResponse } from 'next/server';
import { expireReservations } from '@/lib/orders';
import { runMaintenance } from '@/lib/retention';

export const dynamic = 'force-dynamic';

/** Daily safety net (Vercel Cron). Reservations are ALSO released lazily whenever the admin or checkout loads, so this is not the only mechanism. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const expired = await expireReservations();
  const cleaned = await runMaintenance();
  return NextResponse.json({ expired, cleaned });
}
