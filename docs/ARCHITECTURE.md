# Architecture

## Shape
Single Next.js app (App Router) + single Postgres database. No separate backend, queue or cache. Everything dynamic is rendered on demand (live stock, schedule and settings), so there is no static-cache invalidation to manage.

```
src/
  app/(site)/[locale]/…   storefront pages (fr | en path prefix)
  app/admin/…             owner admin (login + (panel) group with 4 sections)
  app/api/…               quote, checkout, track, my-orders, admin (orders, upload), cron
  lib/                    all business logic (framework-agnostic, unit-tested)
  components/             storefront UI;  components/admin/ admin UI
  i18n/                   fr/en dictionaries (static keys verified by scripts/i18n-check.ts)
  data/image-manifest.ts  single source of truth for generated images
prisma/                   schema, migrations, seed
tests/                    Vitest (real Postgres) · scripts/e2e.mjs (Playwright)
```

## Key decisions
- **Locale in the URL** (`/fr/…`, `/en/…`): proper canonical + `hreflang` alternates and a persisted preference cookie. Middleware redirects `/` using cookie → `Accept-Language` → French. Admin is not prefixed; its language is the same cookie.
- **Money = integer cents** everywhere. Prices are always recomputed server-side (`lib/cart.ts` → `lib/pricing.ts`); client totals are display-only.
- **One inventory table** (`Component`: items, basket bases, presentation options) consumed by both ready-made recipes (`ProductComponent`) and custom baskets. Availability of a ready-made basket is *derived* from its recipe.
- **Concurrency safety is done in SQL**, not in application memory: guarded `UPDATE … WHERE stockOnHand - stockReserved >= qty`, `INSERT … ON CONFLICT` for customers, a per-delivery-day `pg_advisory_xact_lock` for capacity, `SELECT … FOR UPDATE` on orders for status transitions, and a unique `idempotencyKey` for double-submits.
- **Rate limiting** uses a small `RateLimit` table (fixed window) — works on serverless without Redis.
- **Auth**: Better Auth (email + password, sign-up disabled, owner created by seed). Every admin page, server action and API route re-checks the session server-side (`requireAdmin` / `adminOrNull`); the middleware only adds no-index/no-store headers.
- **Customer access** is *not* an account: see `CUSTOMER_IDENTITY.md`.
- **Reservation expiry** has three triggers so no paid scheduler is required: lazy sweep on admin/checkout/home loads, an admin "reactivate" flow, and a daily Vercel cron (`/api/cron/expire`, bearer `CRON_SECRET`) that also purges expired verification data and old orders per the retention setting.
- **Images**: `<img>` with explicit aspect ratios and lazy loading below the fold; hero uses `<picture>` with a mobile crop. Cloudinary in production, local `public/uploads` in dev only (uploads validate MIME, magic bytes and 5 MB).
- **Seasonal content is data, not code**: campaigns/collections live in the DB; with no published campaign a neutral evergreen hero is shown; empty/inactive collections are hidden automatically. Christmas appears only in seed data and image files.

## Data model (summary)
`Customer` (phone E.164 + `isDemo` unique) → `Order` (contact & delivery **snapshot**, frozen fee/taxes/total, payment + fulfillment status, inventoryState, public token, idempotency key) → `OrderItem` (name/price/contents snapshot) and `OrderStockLine` (exact units reserved) · `OrderEvent` (audit trail) · `Component`/`Category`/`Product`/`Collection`/`Campaign`/`DeliveryZone(+Prefix)` · `VerificationCode`, `CustomerSession`, `RateLimit`, `Setting` (typed JSON, Zod-validated), `Counter` (order numbers), Better Auth tables.
