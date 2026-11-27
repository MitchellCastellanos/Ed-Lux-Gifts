# Assumptions, open decisions, external services and costs

## Assumptions made
- Stock is **consumed at delivery**, reserved at order time (one simple rule; see BUSINESS_RULES).
- A custom basket must contain at least one item; a basket with several of the same item is one line.
- Customer history access is derived from **order snapshots** (email + phone), not from the customer row.
- Dates are stored as `YYYY-MM-DD` business dates (America/Toronto); capacity counts non-cancelled orders per day, separately for demo and live data.
- Prices are tax-exclusive; taxes are added at checkout when configured.
- Order numbers: `EDL-001xxx` live, `DEMO-001xxx` demo (counter starts at 1001).
- Mockup interpreted: wordmark/monogram, nav, hero, service strip, two path cards and closing band reproduced; sprig/ornament artwork and the "champagne/brand name" products are intentionally not reproduced (replaceable campaign imagery; legal/brand caution).

## Unresolved business decisions
Tax registration; real delivery coverage and rates; per-day capacity; Interac payment deadline (48 h default); retention period; whether to sell alcohol; real catalogue/prices/stock; privacy officer and policy text; domain and sender email; whether the owner wants the optional "Instagram/Facebook" links shown.

## Known limitations
- Images are placeholders until generated (prompts ready). The original business photographs and the `image-generator` skill named in the brief were not available in this environment; the installed `image-prompts` skill was used instead.
- Single admin user (no roles) by design; password reset is by re-running the seed/DB (no email reset flow).
- Email is best-effort (a failed email never invalidates an order); there is no retry queue.
- Rate limiting is a DB fixed window (adequate for a small shop, not a DDoS shield).
- Carousel supports several published banners but only one is seeded; no drag-and-drop ordering.
- Interac payments are verified manually by design; there is no bank integration.
- Stock consumption at delivery means physical stock must be adjusted manually if items are used earlier.
- Accessibility was checked by structure, keyboard/focus styles and automated overflow tests at 320–768 px; **no screen-reader or automated axe audit was run**.
- Lighthouse/Core Web Vitals were not measured.
- Admin tables/dialogs are keyboard-usable; native `<dialog>` is used for confirmations.

## External services and estimated recurring cost (verify current pricing)
| Service | Why | Estimate |
|---|---|---|
| Vercel (Pro recommended; Hobby is non-commercial) | hosting, cron | ~US$20/mo |
| Neon Postgres | database | Free tier is likely enough initially; Launch ≈ US$5–19/mo |
| Resend | verification codes for "Mes commandes" / order recovery (the platform sends no order-confirmation emails) | Free tier (3,000/mo, 100/day) likely enough; US$20/mo beyond |
| Cloudinary | image storage/CDN | Free tier likely enough |
| Domain | | ~C$20/yr |
| **Total** | | **≈ US$20–40/mo** (≈US$0–5 if hosted on a free tier despite licensing limits) |
No paid service is required by the code beyond hosting; none was provisioned.
