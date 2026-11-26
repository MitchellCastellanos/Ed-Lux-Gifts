import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/auth';
import { LoginForm } from './LoginForm';
import { Monogram } from '@/components/Logo';

export const dynamic = 'force-dynamic';
export default async function LoginPage() {
  if (await getAdminSession()) redirect('/admin/orders');
  return (
    <div className="on-dark flex min-h-screen items-center justify-center bg-emerald-dark px-4">
      <div className="w-full max-w-sm rounded-lg bg-ivory p-7 shadow-xl">
        <div className="mb-5 flex flex-col items-center"><Monogram size={54} /><p className="font-display text-sm uppercase tracking-[0.2em] text-emerald">ED LUX GIFTS</p></div>
        <LoginForm />
      </div>
    </div>
  );
}
