import { notFound } from 'next/navigation';
import { getT } from '@/i18n/server';
import { prisma } from '@/lib/db';
import { Flash } from '@/components/admin/ui';
import { ComponentForm } from '../../ComponentForm';

export default async function ItemEditor({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ kind?: string; error?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { t } = await getT();
  let kind: 'ITEM' | 'PRESENTATION' = sp.kind === 'PRESENTATION' ? 'PRESENTATION' : 'ITEM';
  if (id !== 'new') { const c = await prisma.component.findUnique({ where: { id } }); if (!c || c.kind === 'BASE') notFound(); kind = c.kind as any; }
  return (<><h2 className="mb-4 font-display text-2xl font-semibold">{id === 'new' ? (kind === 'ITEM' ? t('a.items.add') : t('a.options.add')) : t('a.edit')}</h2><Flash error={sp.error} /><ComponentForm id={id} kind={kind} /></>);
}
