# Deployment (Vercel + Neon)

Nothing here has been run for you: **no infrastructure was provisioned and nothing was deployed.** Do this only with the owner's authorization.

1. **Neon**: create a project (region close to Montréal, e.g. `aws-us-east-1`). Copy the *pooled* connection string → `DATABASE_URL`, the *direct* one → `DIRECT_URL`.
2. **Migrate & seed**: `DATABASE_URL=… DIRECT_URL=… npx prisma migrate deploy`, then create **only** the owner account: `SEED_ADMIN_ONLY=1 ADMIN_EMAIL=… ADMIN_PASSWORD='<strong>' NODE_ENV=production npm run db:seed`. (Without `SEED_ADMIN_ONLY` the seed also loads the Christmas demo data, which is useful for a staging/demo deployment.)
3. **Resend**: verify the sending domain, create an API key → `RESEND_API_KEY`, `EMAIL_PROVIDER=resend`, `EMAIL_FROM="ED LUX GIFTS <orders@your-domain>"`.
4. **Cloudinary**: create a free account → `CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET` (uploads are disabled in production without it, because Vercel's disk is read-only).
5. **Vercel**: import the repo. Environment variables (Production): `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SITE_URL` (final https URL), `BETTER_AUTH_URL` (same), `BETTER_AUTH_SECRET` and `APP_SECRET` (`openssl rand -base64 32` each), `EMAIL_*`, `CLOUDINARY_*`, `CRON_SECRET`. Build command is `npm run build` (runs `prisma generate`). `vercel.json` registers a daily cron for `/api/cron/expire` (Vercel sends `Authorization: Bearer $CRON_SECRET`).
6. Add the custom domain, then set `NEXT_PUBLIC_SITE_URL`/`BETTER_AUTH_URL` to it and redeploy.
7. Log in at `/admin`, change the password, walk through *Réglages › Lancement*.

### Notes
- The app refuses to start in production without `BETTER_AUTH_SECRET`/`APP_SECRET`; the dev email adapter and on-screen codes are inactive when `NODE_ENV=production`.
- `/admin`, `/api`, private order/history/track/checkout/cart pages are `noindex`; while the store is in demo mode `robots.txt` disallows everything and all pages are `noindex`.
- **Vercel Hobby is for non-commercial use** — a commercial storefront should use a paid plan (see costs).
- Backups: enable Neon point-in-time restore; export orders periodically for accounting.
