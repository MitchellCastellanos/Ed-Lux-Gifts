# Test results

Everything below was actually executed in the delivery environment (Node 22, PostgreSQL 16 on localhost). Timestamps: see `docs/E2E_RESULTS.md` for the browser run.

| Check | Result |
|---|---|
| `tsc --noEmit` | pass |
| `next lint` | pass, 0 warnings/errors |
| `scripts/i18n-check.ts` (every static `t()` key exists in FR and EN; dictionaries identical) | pass |
| `vitest run` — 5 files, **69 tests** | pass |
| `next build` (production) | pass |
| Production-mode HTTP checks (`next start`, `NODE_ENV=production`): email provider `dev` is inert, history request returns `unavailable`, no code in responses, `robots.txt` disallows all in demo mode, private pages `no-store` + `noindex`, `/admin` redirects, cron without secret = 401 | pass |
| Browser end-to-end (`scripts/e2e.mjs`, Playwright/Chromium, isolated DB) — **21 checks** | 21/21 pass |
| Horizontal-overflow check (`scripts/overflow.mjs`) at 320/375/390/768 px on 10 storefront pages | no overflow |

## Vitest coverage map
- **Commerce/inventory** (`commerce.test.ts`): custom pricing, capacity, included-vs-paid options, shared stock between ready-made and custom baskets, ready-made availability from recipe, **concurrent overselling** (10 parallel orders vs 3 units → exactly 3), cancellation restore (once), delivery consumes once, Interac expiry + idempotent sweep, reactivation (incl. stock sold meanwhile), COD never expires, unpaid Interac cannot be prepared, disabled payment methods, live-mode fictional Interac block, **idempotency under concurrency**, stale price / wrong total rejection, mixed carts, archived-product snapshots.
- **Delivery** (`commerce.test.ts`, `pure.test.ts`): Friday-13:00 cutoff (incl. DST), weekend availability, closed dates, paused store, concurrent **per-day capacity**, postal normalization, zone matching/disabled zones, fee calculation, **historical fee preservation**, free threshold, configurable taxes.
- **Customer identity** (`customers.test.ts`): E.164 normalization (all formats), international numbers, same customer for equivalent formats, concurrent creation → one customer, recipient phone separation, shared number + different name/email (snapshot kept, record not overwritten, discrepancy flagged), contact snapshot preserved on edits, phone-correction collision (never merges), order reassignment, admin search by formatted/normalized/partial phone/name/email, demo/live isolation.
- **Tracking & history** (`verification.test.ts`): phone-only never grants access, generic responses, full flow with only email+phone-matching orders, shared phone/different email privacy, single-use (also concurrent), expiry, attempt limits, resend cooldown, throttling, session expiry, order recovery sends to the *order* email, unguessable tokens, safe failure when email is unavailable, demo scope isolation.
- **Security/privacy** (`security.test.ts`): dev email/codes disabled in production, upload type/signature/size validation, customer anonymization, retention purge.

## Browser end-to-end coverage (all 18 flows requested + extras)
1 ready-made + Interac · 2 custom + Interac · 3 payment on delivery · 4 mixed baskets · 5 order from creation to delivery in the admin (incl. confirmation dialog on cancel) · 6 edit product/price + inventory (negative stock refused) · 7 change a delivery fee and see it at checkout · 8 close the current weekend · 9 edit / unpublish (neutral hero) / republish campaign, no carousel controls for one banner · 10 create a collection in the admin and view it · 11 two orders with different phone formats → one customer · 12 admin phone search finds both · 13 customer history in admin · 14 private-link tracking (new context, `no-store`/`noindex`, sequential number is not a token) · 15 order recovery with code (wrong code rejected first) · 16 passwordless history limited to the verified email + phone, other purchaser's order on the same page is 404, logout works · 17 visitor with only a phone number gets nothing · 18 recipient phone creates/identifies no customer · plus admin route/API protection, prefix-conflict rejection, recipe editor, mobile admin, robots/noindex headers.

## Honest notes
- The e2e suite runs the **development server** (needs on-screen dev codes). Production-mode behaviour is covered by the HTTP checks above and the unit tests, not by re-running the browser suite against `next start`.
- While writing the suite, three assertions were timing-sensitive (waiting for server actions / compiles) and were made to wait for the visible result instead of a fixed delay; no application bug was hidden by that change.
- Not run: screen-reader/axe accessibility audit, Lighthouse, load testing, real Resend/Cloudinary/Neon integration (no credentials, by design).
