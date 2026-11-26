import { NextResponse } from 'next/server';
import { adminOrNull } from '@/lib/auth';
import { queryWorkspace, FILTERS, type OrderFilter } from '@/lib/admin-orders';
import { expireReservations } from '@/lib/orders';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if (!(await adminOrNull())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const u = new URL(req.url);
  const f = u.searchParams.get('filter') as OrderFilter;
  await expireReservations().catch(() => {});
  const data = await queryWorkspace({ filter: FILTERS.includes(f) ? f : 'all', q: u.searchParams.get('q') ?? '', date: u.searchParams.get('date') ?? '', pay: u.searchParams.get('pay') ?? '' });
  return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
}
