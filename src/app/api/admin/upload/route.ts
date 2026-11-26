import { NextResponse } from 'next/server';
import { adminOrNull } from '@/lib/auth';
import { storeImage } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!(await adminOrNull())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const fd = await req.formData().catch(() => null);
  const f = fd?.get('file');
  if (!(f instanceof File)) return NextResponse.json({ error: 'type' }, { status: 400 });
  const r = await storeImage(f);
  return r.ok ? NextResponse.json({ url: r.url }) : NextResponse.json({ error: r.error }, { status: r.error === 'storage' ? 503 : 422 });
}
