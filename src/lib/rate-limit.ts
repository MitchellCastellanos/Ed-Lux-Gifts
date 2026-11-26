import { prisma } from './db';

/** Fixed-window DB-backed rate limiter (works on serverless without Redis). Returns true when allowed. */
export async function rateLimit(key: string, max: number, windowSec: number): Promise<boolean> {
  const now = new Date();
  const rows = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimit" ("key","count","windowStart") VALUES (${key}, 1, ${now})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."windowStart" < ${new Date(now.getTime() - windowSec * 1000)} THEN 1 ELSE "RateLimit"."count" + 1 END,
      "windowStart" = CASE WHEN "RateLimit"."windowStart" < ${new Date(now.getTime() - windowSec * 1000)} THEN ${now} ELSE "RateLimit"."windowStart" END
    RETURNING "count"`;
  return rows[0].count <= max;
}

export function clientIp(h: Headers): string {
  return (h.get('x-forwarded-for')?.split(',')[0] ?? h.get('x-real-ip') ?? 'unknown').trim();
}
