# Production launch checklist

**Owner decisions / information**
- [ ] Legal business name, real phone, email, address; confirm what may be published (enable "real and verified" only then — it controls LocalBusiness structured data).
- [ ] Real Interac e-Transfer address and wording; auto-deposit vs. security question policy.
- [ ] Confirm delivery areas, postal prefixes and rates (the seeded zones are **illustrative**); free-delivery thresholds.
- [ ] Final schedule: cutoff, delivery days, per-day capacity, advance window, holiday closures.
- [ ] **Tax treatment** (GST/QST registration, taxable products) confirmed with an accountant.
- [ ] Real catalogue, stock and photographs (generated demo images are concept images, not the owner's inventory).
- [ ] Confirm alcoholic products are *not* sold until legal requirements are confirmed (demo uses non-alcoholic alternatives).
- [ ] Privacy officer named; privacy policy and terms reviewed by counsel (Law 25); retention period; process for access/correction/erasure; incident plan; confirm hosting/processors' regions.

**Technical**
- [ ] Neon (backups on), Vercel plan suitable for commercial use, custom domain + HTTPS.
- [ ] Env vars set (see DEPLOYMENT.md); secrets are not in git; `ADMIN_PASSWORD` strong and rotated after first login.
- [ ] Resend domain verified (SPF/DKIM); *Réglages › Communications › test email* succeeds; try "Mes commandes" end to end.
- [ ] Cloudinary configured and a photo upload tested.
- [ ] Place a full test order (Interac + payment on delivery), process it to delivery, then delete it.
- [ ] *Réglages › Lancement › Nettoyer* demo data; then **Passer en production**.
- [ ] Check `robots.txt` / `sitemap.xml` on the live domain; run Lighthouse on home and product pages.
- [ ] Confirm the daily cron ran (`/api/cron/expire` in Vercel logs).
