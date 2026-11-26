import { redirect } from 'next/navigation';
import { getSettings } from '@/lib/settings';
export default async function S() { redirect((await getSettings()).store.mode === 'demo' ? '/admin/settings/launch' : '/admin/settings/business'); }
