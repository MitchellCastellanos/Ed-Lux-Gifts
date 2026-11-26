import { NextResponse } from 'next/server';
import { z } from 'zod';
import { adminOrNull } from '@/lib/auth';
import { applyAction } from '@/lib/orders';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await adminOrNull();
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const b = z.object({ action: z.enum(['confirm', 'markPaid', 'prepare', 'ready', 'deliver', 'deliverPaid', 'cancel', 'refund', 'reactivate', 'unpay']), note: z.string().max(300).optional() }).safeParse(await req.json().catch(() => null));
  if (!b.success) return NextResponse.json({ ok: false, error: 'invalid' }, { status: 400 });
  const r = await applyAction(id, b.data.action, { actor: s.user.email, note: b.data.note });
  return NextResponse.json(r, { status: r.ok ? 200 : 409 });
}
