# ED LUX GIFTS — storefront & order management

Bilingual (FR-CA default / EN-CA) e-commerce site and lightweight order-management system for a Pointe-Claire gift-basket business. A **GABAN Solutions** client project.

One Next.js app, one Postgres database. No traditional customer accounts: customers are identified operationally by **phone number**, can track an order with a private link, and can retrieve their history with a **passwordless email code**.

| | |
|---|---|
| Stack | Next.js 15 (App Router) · TypeScript · Tailwind CSS 3 · PostgreSQL (Neon) · Prisma 6 · Better Auth (admin only) · Zod · Lucide · libphonenumber-js |
| Email / images | Resend (or the dev adapter) · Cloudinary (or local `public/uploads` in dev) |
| Deploy | Vercel-compatible (see `docs/DEPLOYMENT.md`) |

> **Status:** the complete application is implemented and runs in **demo mode** with a Christmas-only fictional dataset. Photography: 37 of 38 generated images are in place; `bases/base-small.jpg` is still a temporary placeholder (see `docs/IMAGE_ASSETS.md`). A demo deployment exists on Vercel (`ed-lux-gifts.vercel.app`, Vercel-login protected) backed by a free Neon project; no other paid service has been provisioned.

## Quick start (local)

Requirements: Node 20+, PostgreSQL 14+.

```bash
npm install
cp .env.example .env          # then edit DATABASE_URL / secrets
npx prisma migrate deploy     # create the schema
npm run db:seed               # Christmas demo data + admin account
npx tsx scripts/make-placeholders.ts   # only if public/images is missing
npm run dev                   # http://localhost:3000  (redirects to /fr)
```

- Storefront: `http://localhost:3000/fr` (or `/en`)
- Admin: `http://localhost:3000/admin` — dev login from the seed: `owner@example.com` / `demo-owner-pass-2026` (override with `ADMIN_EMAIL` / `ADMIN_PASSWORD`; **required** in production, the seed refuses to run in production without a password).
- With `EMAIL_PROVIDER=dev` (default, never active when `NODE_ENV=production`) verification codes are shown on screen and emails are stored in the `DevEmail` table instead of being sent.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run typecheck` · `npm run lint` | TypeScript / ESLint |
| `npm test` | Vitest (needs the `edlux_test` database, see below) |
| `npm run db:deploy` · `db:seed` | Migrations / demo seed |
| `scripts/e2e-reset.sh` then `node scripts/e2e.mjs` | Browser end-to-end suite on an isolated DB + port 3100 (writes `docs/E2E_RESULTS.md`) |
| `node scripts/screens.mjs`, `node scripts/overflow.mjs <paths>` | Screenshots / horizontal-overflow check at 320/375/390/768 px |
| `npx tsx scripts/gen-image-docs.ts` | Regenerates `docs/IMAGE_ASSETS.md` from the image manifest |

Tests use a separate database: `createdb edlux_test && DATABASE_URL=postgresql://…/edlux_test npx prisma migrate deploy`. `vitest.config.ts` points at `postgresql://postgres@localhost:5432/edlux_test`; edit it for your setup.

## Test results (what was actually run)

See `docs/TEST_RESULTS.md`. Summary: 68 Vitest tests, 21 browser end-to-end checks, lint, typecheck and a production build all pass; production-mode behaviour was verified with HTTP checks. Known gaps are listed there honestly.

## Documentation

- `docs/ARCHITECTURE.md` – structure & key decisions
- `docs/BUSINESS_RULES.md` – inventory lifecycle, pricing, schedule, delivery, payments, taxes
- `docs/CUSTOMER_IDENTITY.md` – phone-first model vs. verified access
- `docs/ADMIN_GUIDE.md` – plain-language owner guide
- `docs/IMAGE_ASSETS.md` – asset manifest & generation prompts
- `docs/DEPLOYMENT.md`, `docs/PRODUCTION_CHECKLIST.md`
- `docs/ASSUMPTIONS_AND_COSTS.md` – assumptions, open business decisions, external services & recurring costs
