import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { nextCookies } from 'better-auth/next-js';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from './db';

if (process.env.NODE_ENV === 'production' && !process.env.BETTER_AUTH_SECRET && process.env.NEXT_PHASE !== 'phase-production-build') {
  throw new Error('BETTER_AUTH_SECRET must be set in production');
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  // The owner account is created by `npm run db:seed`; public sign-up is disabled.
  emailAndPassword: { enabled: true, disableSignUp: true, minPasswordLength: 10, maxPasswordLength: 128 },
  session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
  plugins: [nextCookies()],
});

export async function getAdminSession() {
  return auth.api.getSession({ headers: await headers() });
}

/** Server-side authorization: call at the top of every admin page, action and API route. */
export async function requireAdmin() {
  const s = await getAdminSession();
  if (!s) redirect('/admin/login');
  return s;
}

/** For route handlers: returns the session or null (caller answers 401). */
export async function adminOrNull() {
  try {
    return await getAdminSession();
  } catch {
    return null;
  }
}
