// End-to-end smoke tests (real browser, real server, real database). Run: BASE=http://localhost:3100 node scripts/e2e.mjs
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const BASE = process.env.BASE ?? 'http://localhost:3100';
const ADMIN = { email: process.env.ADMIN_EMAIL ?? 'owner@example.com', password: process.env.ADMIN_PASSWORD ?? 'demo-owner-pass-2026' };
const OUT = 'screenshots'; fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const results = [];
const ok = (c, msg) => { if (!c) throw new Error('assertion failed: ' + msg); };
async function step(name, fn) {
  try { await fn(); results.push([name, 'PASS']); console.log('PASS', name); }
  catch (e) { results.push([name, 'FAIL: ' + e.message.split('\n')[0]]); console.log('FAIL', name, '\n   ', e.message.split('\n').slice(0, 3).join('\n    ')); }
}
const shot = async (p, name, full = true) => { await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 50)); } window.scrollTo(0, 0); }); await p.waitForTimeout(400); await p.screenshot({ path: `${OUT}/${name}.png`, fullPage: full }); };
const newCtx = (w = 1440, h = 900) => browser.newContext({ viewport: { width: w, height: h } });

async function addReady(p, slug, qty = 1) {
  await p.goto(`${BASE}/fr/baskets/${slug}`, { waitUntil: 'networkidle' });
  for (let i = 1; i < qty; i++) await p.getByRole('button', { name: '+' }).click();
  await p.getByRole('button', { name: 'Ajouter au panier' }).click();
  await p.getByText('Ajouté à votre panier').waitFor();
}
async function addCustom(p) {
  await p.goto(`${BASE}/fr/build`, { waitUntil: 'networkidle' });
  await p.getByRole('button', { name: /Panier moyen/ }).click();
  await p.getByRole('button', { name: 'Continuer' }).click();
  await p.getByRole('button', { name: 'Ajouter Chocolats assortis' }).first().click();
  await p.getByRole('button', { name: 'Ajouter Chocolats assortis' }).first().click();
  await p.getByRole('button', { name: 'Continuer' }).click();
  await p.getByRole('button', { name: /récapitulatif/ }).click();
  await p.getByRole('button', { name: 'Ajouter au panier' }).click();
  await p.waitForURL('**/cart');
}
async function checkout(p, o) {
  await p.goto(`${BASE}/fr/checkout`, { waitUntil: 'networkidle' });
  await p.getByLabel(/Numéro de téléphone/).fill(o.phone);
  await p.getByLabel(/Nom complet/).fill(o.name);
  await p.getByLabel(/^Courriel/).fill(o.email);
  await p.getByLabel(/Adresse de livraison/).fill('12 rue Exemple');
  await p.getByLabel(/^Ville/).fill('Pointe-Claire');
  await p.getByLabel(/^Code postal/).fill(o.postal ?? 'H9R 1A1');
  if (o.recipientPhone) { await p.getByLabel(/destinataire est une autre/).check(); await p.getByLabel('Nom du destinataire').fill('Destinataire Test'); await p.getByLabel(/Téléphone du destinataire/).fill(o.recipientPhone); }
  const radios = p.getByRole('radio', { name: /^(samedi|dimanche)/i });
  await radios.nth(o.dateIndex ?? 0).check();
  await p.getByRole('radio', { name: new RegExp(o.pay ?? 'Virement Interac') }).check();
  await p.getByLabel(/J’accepte/).check();
  await p.waitForTimeout(900);
  await p.getByRole('button', { name: 'Passer la commande' }).last().click();
  await p.waitForURL(/\/order\/.+placed=1/, { timeout: 20000 });
  const num = (await p.getByTestId('order-number').textContent()).trim();
  return { number: num, url: p.url().replace('?placed=1', '') };
}
async function adminLogin(p) {
  await p.goto(`${BASE}/admin/login`, { waitUntil: 'networkidle' });
  await p.getByLabel('Courriel').fill(ADMIN.email); await p.getByLabel('Mot de passe').fill(ADMIN.password);
  await p.getByRole('button', { name: 'Se connecter' }).click(); await p.waitForURL('**/admin/orders');
}

const state = {};
const ctx = await newCtx();
const page = await ctx.newPage();
const admin = await (await newCtx()).newPage();

await step('security: admin is protected (page redirects, API returns 401)', async () => {
  const c = await newCtx(); const p = await c.newPage();
  await p.goto(`${BASE}/admin/orders`); ok(p.url().includes('/admin/login'), 'redirect to login');
  const r = await p.request.get(`${BASE}/api/admin/orders`); ok(r.status() === 401, 'orders api 401');
  const u = await p.request.post(`${BASE}/api/admin/upload`); ok(u.status() === 401, 'upload api 401');
  await c.close();
});

await step('1. ready-made basket ordered with Interac (+ #11 phone format A, #18 recipient phone)', async () => {
  await addReady(page, 'petit-cadeau');
  await page.goto(`${BASE}/fr/cart`, { waitUntil: 'networkidle' });
  const r = await checkout(page, { phone: '514-555-0901', name: 'Test Acheteur', email: 'acheteur.test@example.com', pay: 'Virement Interac', recipientPhone: '438-555-0155' });
  state.o1 = r;
  await page.getByText('Paiement non encore vérifié').waitFor();
  ok(await page.getByText('demo-paiements@example.com').first().isVisible(), 'interac email visible');
  ok(await page.getByRole('button', { name: /Copier/ }).count() >= 3, 'copy buttons');
  await shot(page, 'interac-confirmation');
});

await step('2+4. custom basket + ready-made together, payment on delivery (cash); phone format B resolves to same customer', async () => {
  await addCustom(page); await addReady(page, 'cafe-the');
  await page.goto(`${BASE}/fr/cart`, { waitUntil: 'networkidle' });
  ok((await page.getByText('Panier personnalisé').count()) >= 1 && (await page.getByText('Café et thé').count()) >= 1, 'both items in cart');
  const r = await checkout(page, { phone: '(514) 555-0901', name: 'Test Acheteur', email: 'acheteur.test@example.com', pay: 'Comptant à la livraison', dateIndex: 1 });
  state.o2 = r;
  await page.getByText(/Vous paierez/).waitFor();
  await shot(page, 'cod-confirmation');
});

await step('3. payment-on-delivery order shows amount due (verified above) & Interac custom order works', async () => {
  await addCustom(page);
  const r = await checkout(page, { phone: '+1 514 555 0902', name: 'Autre Client', email: 'autre.client@example.com', pay: 'Virement Interac', dateIndex: 2 });
  state.o3 = r;
  ok((await page.getByText('Montant à transférer').count()) === 1, 'interac amount shown');
});

await step('14. track an order with its secure private link (no cookies, new browser context)', async () => {
  const c = await newCtx(); const p = await c.newPage();
  await p.goto(state.o1.url, { waitUntil: 'networkidle' });
  ok((await p.getByTestId('order-number').textContent()).trim() === state.o1.number, 'number matches');
  await p.getByText('Commande reçue').first().waitFor();
  await shot(p, 'order-tracking-timeline');
  const nf = await p.goto(`${BASE}/fr/order/EDL-001001`); ok(nf.status() === 404, 'sequential number is not a token');
  const hdr = (await p.goto(state.o1.url)).headers(); ok(/no-store/.test(hdr['cache-control'] ?? ''), 'private no-store: ' + hdr['cache-control']); ok(/noindex/.test(hdr['x-robots-tag'] ?? ''), 'noindex');
  await c.close();
});

await adminLogin(admin);

await step('12+13. admin phone search finds both orders (different formats) and opens the customer history', async () => {
  await admin.goto(`${BASE}/admin/orders`, { waitUntil: 'networkidle' });
  await shot(admin, 'admin-orders');
  const search = admin.getByPlaceholder(/Rechercher par téléphone/);
  await search.fill('5145550901'); await admin.waitForTimeout(1500);
  ok(await admin.getByText('Clients correspondants').isVisible(), 'customer matches section');
  ok((await admin.getByRole('link', { name: state.o1.number }).count()) >= 1 && (await admin.getByRole('link', { name: state.o2.number }).count()) >= 1, 'both orders listed');
  await shot(admin, 'admin-phone-search');
  await search.fill('555-09'); await admin.waitForTimeout(1200);
  ok((await admin.getByRole('link', { name: state.o3.number }).count()) >= 1, 'partial phone finds other customers too');
  await search.fill('(514) 555-0901'); await admin.waitForTimeout(1200);
  await admin.getByRole('link', { name: 'Ouvrir la fiche' }).first().click(); await admin.waitForURL('**/customers/**');
  ok((await admin.getByRole('link', { name: state.o1.number }).count()) === 1 && (await admin.getByRole('link', { name: state.o2.number }).count()) === 1, 'both orders in history');
  await shot(admin, 'admin-customer-history');
});

await step('11. both orders attached to ONE customer record (no duplicate)', async () => {
  const body = await admin.locator('body').innerText();
  ok(/Commandes\s*\n?\s*\d+/.test(body) || body.includes('Test Acheteur'), 'customer page');
  await admin.goto(`${BASE}/admin/orders`); await admin.getByPlaceholder(/Rechercher par téléphone/).fill('Test Acheteur'); await admin.waitForTimeout(1200);
  ok((await admin.getByRole('link', { name: 'Ouvrir la fiche' }).count()) === 1, 'exactly one customer');
});

await step('18. recipient phone does not create or identify a purchaser customer', async () => {
  await admin.goto(`${BASE}/admin/orders`); await admin.getByPlaceholder(/Rechercher par téléphone/).fill('438-555-0155'); await admin.waitForTimeout(1200);
  ok((await admin.getByRole('link', { name: 'Ouvrir la fiche' }).count()) === 0, 'no customer for recipient phone');
  ok(await admin.getByText('Aucun client ne correspond').isVisible(), 'empty customer match message');
});

await step('15. recover an order with the verification flow (order number + phone → code sent to order email)', async () => {
  const c = await newCtx(); const p = await c.newPage();
  await p.goto(`${BASE}/fr/track`, { waitUntil: 'networkidle' });
  await p.getByLabel('Numéro de téléphone').fill('5145550901'); await p.getByLabel('Numéro de commande').fill(state.o1.number);
  await p.getByRole('button', { name: 'Envoyer le code' }).click();
  const dev = await p.getByTestId('dev-code').locator('b').textContent();
  await shot(p, 'verify-code-step');
  await p.getByLabel('Code à 6 chiffres').fill('000000' === dev ? '111111' : '000000'); await p.getByRole('button', { name: 'Vérifier' }).click();
  await p.getByText(/Code invalide/).waitFor();
  await p.getByLabel('Code à 6 chiffres').fill(dev); await p.getByRole('button', { name: 'Vérifier' }).click();
  await p.waitForURL(/\/order\//); ok((await p.getByTestId('order-number').textContent()).trim() === state.o1.number, 'opened right order');
  await c.close();
});

await step('16. passwordless history shows ONLY orders matching verified email + phone', async () => {
  const c = await newCtx(); const p = await c.newPage();
  await p.goto(`${BASE}/fr/my-orders`, { waitUntil: 'networkidle' });
  await p.getByLabel('Numéro de téléphone').fill('(514) 555-0901'); await p.getByLabel('Courriel').fill('Acheteur.Test@example.com');
  await p.getByRole('button', { name: 'Envoyer le code' }).click();
  const dev = await p.getByTestId('dev-code').locator('b').textContent();
  await p.getByLabel('Code à 6 chiffres').fill(dev); await p.getByRole('button', { name: 'Vérifier' }).click();
  await p.getByRole('heading', { name: 'Commandes actives' }).waitFor();
  const body = await p.locator('body').innerText();
  ok(body.includes(state.o1.number) && body.includes(state.o2.number), 'own orders listed');
  ok(!body.includes(state.o3.number), 'other customer order NOT listed');
  await shot(p, 'customer-order-history');
  await p.getByRole('link', { name: 'Voir le détail' }).first().click(); await p.waitForURL(/my-orders\/(EDL|DEMO)/);
  // shared-number privacy: seeded demo household (514-555-0123) has two different emails
  await p.goto(`${BASE}/fr/my-orders/DEMO-001004`); await p.getByText('Page introuvable').waitFor({ timeout: 15000 }); ok(true, 'cannot open another purchaser order by number');
  await p.getByRole('button', { name: 'Terminer la session' }).count();
  await p.goto(`${BASE}/fr/my-orders`);
  await p.getByRole('button', { name: 'Terminer la session' }).click(); await p.waitForTimeout(800);
  await p.goto(`${BASE}/fr/my-orders`); ok(await p.getByRole('button', { name: 'Envoyer le code' }).isVisible(), 'session ended');
  // mobile view of history
  const m = await browser.newContext({ viewport: { width: 390, height: 844 } }); const mp = await m.newPage();
  await mp.goto(`${BASE}/fr/my-orders`); await mp.getByLabel('Numéro de téléphone').fill('5145550901'); await mp.getByLabel('Courriel').fill('acheteur.test@example.com');
  await mp.getByRole('button', { name: 'Envoyer le code' }).click(); const d2 = await mp.getByTestId('dev-code').locator('b').textContent();
  await shot(mp, 'mobile-verify-code');
  await mp.getByLabel('Code à 6 chiffres').fill(d2); await mp.getByRole('button', { name: 'Vérifier' }).click(); await mp.getByRole('heading', { name: 'Commandes actives' }).waitFor();
  await shot(mp, 'mobile-customer-order-history'); await m.close();
  await c.close();
});

await step('17. a visitor who only knows a phone number gets nothing (no code, no data, same generic message)', async () => {
  const c = await newCtx(); const p = await c.newPage();
  await p.goto(`${BASE}/fr/my-orders`, { waitUntil: 'networkidle' });
  await p.getByLabel('Numéro de téléphone').fill('514-555-0901'); await p.getByLabel('Courriel').fill('attaquant@example.com');
  await p.getByRole('button', { name: 'Envoyer le code' }).click();
  await p.getByText(/Si les renseignements correspondent/).waitFor();
  ok((await p.getByTestId('dev-code').count()) === 0, 'no code issued for non-matching email');
  await p.getByLabel('Code à 6 chiffres').fill('123456'); await p.getByRole('button', { name: 'Vérifier' }).click();
  await p.getByText(/Code invalide/).waitFor();
  const r = await p.request.post(`${BASE}/api/my-orders`, { data: { action: 'request', phone: '514-555-0901', email: 'attaquant@example.com' } });
  ok(!JSON.stringify(await r.json()).includes('devCode'), 'api has no code');
  const direct = await p.goto(`${BASE}/fr/my-orders/${state.o1.number}`); await p.waitForLoadState('networkidle'); ok(p.url().endsWith('/my-orders') || (await p.getByText('Page introuvable').count()) > 0, 'direct order URL blocked');
  await c.close();
});

await step('5. manage an order from creation to delivery in the admin UI', async () => {
  await admin.goto(`${BASE}/admin/orders`, { waitUntil: 'networkidle' });
  await admin.getByRole('link', { name: state.o1.number }).first().click(); await admin.waitForURL('**/admin/orders/**');
  await shot(admin, 'admin-order-details');
  for (const label of ['Marquer comme payée', 'Commencer la préparation', 'Prête à livrer', 'Marquer livrée']) {
    await admin.getByRole('button', { name: label }).first().click(); await admin.waitForTimeout(1200);
  }
  await admin.getByText('Livrée').first().waitFor();
  // customer-facing tracking now reflects it
  const c = await newCtx(); const p = await c.newPage(); await p.goto(state.o1.url); await p.getByText('Livré').first().waitFor(); await c.close();
  // cancellation requires confirmation dialog
  await admin.goto(`${BASE}/admin/orders`); await admin.getByRole('link', { name: state.o3.number }).first().click();
  await admin.getByRole('button', { name: 'Annuler la commande' }).click(); await admin.getByRole('button', { name: 'Annuler la commande' }).last().click(); await admin.waitForTimeout(1200);
  ok(await admin.getByText('Annulée').first().isVisible(), 'cancelled');
});

await step('6. edit a product price and update inventory without a technical form', async () => {
  await admin.goto(`${BASE}/admin/catalog/items`, { waitUntil: 'networkidle' });
  await shot(admin, 'admin-catalog');
  await admin.getByRole('link', { name: 'Truffes au chocolat noir' }).first().click(); await admin.waitForURL('**/items/**');
  await admin.locator('#price').fill('16,50'); await shot(admin, 'admin-product-editor'); await admin.getByRole('button', { name: 'Enregistrer' }).click(); await admin.waitForURL('**/catalog/items**');
  await page.goto(`${BASE}/fr/build`, { waitUntil: 'networkidle' }); await page.getByRole('button', { name: /Panier moyen/ }).click(); await page.getByRole('button', { name: 'Continuer' }).click();
  await page.getByText(/16,50\s\$/).first().waitFor({ timeout: 15000 }); ok(true, 'new price visible in the builder');
  await admin.goto(`${BASE}/admin/catalog/inventory`, { waitUntil: 'networkidle' });
  await admin.getByPlaceholder(/Rechercher un article/).fill('Bougie dorée');
  const row = admin.locator('li', { hasText: 'Bougie dorée' }).first();
  const before = Number((await row.locator('dd').first().textContent()).trim());
  await row.getByRole('button', { name: 'Mettre à jour le stock' }).click();
  await row.getByLabel('Quantité').fill('5'); await row.getByLabel('Raison').fill('réception'); await shot(admin, 'admin-inventory');
  await row.getByRole('button', { name: 'Enregistrer' }).click(); await admin.waitForTimeout(1500);
  await admin.getByPlaceholder(/Rechercher un article/).fill('Bougie dorée');
  const after = Number((await admin.locator('li', { hasText: 'Bougie dorée' }).first().locator('dd').first().textContent()).trim());
  ok(after === before + 5, `stock ${before} -> ${after}`);
  // negative stock is refused
  const row2 = admin.locator('li', { hasText: 'Bougie dorée' }).first(); await row2.getByRole('button', { name: 'Mettre à jour le stock' }).click();
  await row2.getByLabel('Quantité').fill('-9999'); await row2.getByRole('button', { name: 'Enregistrer' }).click(); await admin.waitForTimeout(1200);
  ok(await admin.getByRole('alert').first().isVisible(), 'negative stock rejected');
});

await step('basket recipe editor (visual, no IDs) renders and saves', async () => {
  await admin.goto(`${BASE}/admin/catalog/baskets`, { waitUntil: 'networkidle' });
  await admin.getByRole('link', { name: 'Petit cadeau' }).first().click(); await admin.waitForURL('**/baskets/**');
  await admin.getByPlaceholder('Rechercher un article…').fill('Noix'); await admin.getByRole('button', { name: /Noix confites/ }).click();
  await shot(admin, 'admin-recipe-editor');
  await admin.getByRole('button', { name: 'Enregistrer' }).click(); await admin.waitForURL('**/catalog/baskets**');
});

await step('7. changing a delivery fee is reflected at checkout', async () => {
  await admin.goto(`${BASE}/admin/settings/delivery`, { waitUntil: 'networkidle' });
  const form = admin.locator('form', { has: admin.getByRole('heading', { name: 'Zone A — Locale' }) });
  await form.locator('input[name=fee]').fill('7,00'); await shot(admin, 'admin-delivery-settings');
  await form.getByRole('button', { name: 'Enregistrer' }).click(); await admin.waitForTimeout(1500);
  await addReady(page, 'petit-cadeau');
  await page.goto(`${BASE}/fr/cart`, { waitUntil: 'networkidle' }); await page.getByLabel(/Code postal/).fill('H9R 1A1'); await page.getByText(/7,00\s\$/).first().waitFor({ timeout: 15000 }); ok(true, 'cart shows 7,00 $ delivery');
});

await step('delivery zone prefix conflicts are rejected', async () => {
  await admin.goto(`${BASE}/admin/settings/delivery`, { waitUntil: 'networkidle' });
  const form = admin.locator('form', { has: admin.getByRole('heading', { name: 'Zone B — Étendue' }) });
  await form.locator('textarea[name=prefixes]').fill('H9A, H9R'); await form.getByRole('button', { name: 'Enregistrer' }).click(); await admin.waitForTimeout(1200);
  ok(await admin.getByText(/appartient déjà à la zone/).isVisible(), 'conflict message');
});

await step('8. close the current weekend without closing the store', async () => {
  await admin.goto(`${BASE}/admin/settings/schedule`, { waitUntil: 'networkidle' });
  await shot(admin, 'admin-schedule-settings');
  await admin.goto(`${BASE}/admin/orders`, { waitUntil: 'networkidle' });
  await page.goto(`${BASE}/fr/checkout`, { waitUntil: 'networkidle' });
  const before = await page.locator('label:has(input[name=date])').allTextContents();
  await admin.goto(`${BASE}/admin/orders`, { waitUntil: 'networkidle' });
  await admin.getByRole('button', { name: 'Fermer ce week-end' }).click(); await admin.waitForTimeout(1500);
  await page.goto(`${BASE}/fr/checkout`, { waitUntil: 'networkidle' });
  const after = await page.locator('label:has(input[name=date])').allTextContents();
  ok(after.length === before.length - 2 && !after.includes(before[0]) && after.length > 0, `closed weekend removed (${before.length} -> ${after.length}), later weekends still open`);
  await admin.goto(`${BASE}/admin/settings/schedule`); await admin.getByRole('button', { name: 'Rouvrir' }).first().click(); await admin.waitForTimeout(1000);
});

await step('9. edit, unpublish and republish the homepage campaign', async () => {
  await admin.goto(`${BASE}/admin/storefront/campaigns`, { waitUntil: 'networkidle' });
  await admin.getByRole('link', { name: /Noël \(démo\)/ }).first().click(); await admin.waitForURL('**/campaigns/**');
  await admin.locator('#headlineFr').fill('Un Noël *féerique*'); await shot(admin, 'admin-campaign-editor');
  await admin.getByRole('button', { name: 'Enregistrer' }).click(); await admin.waitForURL('**/campaigns**');
  await page.goto(`${BASE}/fr`, { waitUntil: 'networkidle' }); ok(await page.getByRole('heading', { level: 1 }).innerText().then((t) => t.includes('féerique')), 'new headline live');
  await admin.getByRole('button', { name: 'Dépublier' }).click(); await admin.getByText('Brouillon').first().waitFor();
  await page.goto(`${BASE}/fr`, { waitUntil: 'networkidle' }); ok((await page.getByRole('heading', { level: 1 }).innerText()).toLowerCase().includes('toujours'), 'neutral evergreen hero when nothing is published');
  await admin.getByRole('button', { name: 'Publier' }).first().click(); await admin.getByRole('button', { name: 'Dépublier' }).first().waitFor();
  await page.goto(`${BASE}/fr`, { waitUntil: 'networkidle' }); ok((await page.getByRole('heading', { level: 1 }).innerText()).includes('féerique'), 'republished');
  ok((await page.getByRole('button', { name: /Bannière précédente/ }).count()) === 0, 'no carousel controls with a single banner');
});

await step('10. create a new collection in the admin and see it on the storefront (no code change)', async () => {
  await admin.goto(`${BASE}/admin/storefront/collections/new`, { waitUntil: 'networkidle' });
  await admin.locator('#nameFr').fill('Collection test'); await admin.getByRole('tab', { name: 'English' }).first().click(); await admin.locator('#nameEn').fill('Test collection');
  await admin.getByLabel('Petit cadeau').check(); await admin.getByRole('button', { name: 'Enregistrer' }).click(); await admin.waitForURL('**/collections**');
  const r = await page.goto(`${BASE}/fr/collections/collection-test`); ok(r.status() === 200, 'collection page');
  ok(await page.getByText('Petit cadeau').first().isVisible(), 'product in collection');
  const empty = await page.goto(`${BASE}/fr/collections/noel`); ok(empty.status() === 200, 'christmas collection still there');
});

await step('admin: customer lookup & mobile admin screenshots', async () => {
  const m = await browser.newContext({ viewport: { width: 390, height: 844 } }); const mp = await m.newPage();
  await adminLogin(mp);
  await shot(mp, 'mobile-admin-orders');
  await mp.getByPlaceholder(/Rechercher par téléphone/).fill('514-555-0123'); await mp.waitForTimeout(1400); await shot(mp, 'mobile-admin-customer-lookup');
  await mp.goto(`${BASE}/admin/catalog/baskets`); await mp.getByRole('link', { name: 'Panier Réveillon' }).first().click(); await mp.waitForTimeout(800); await shot(mp, 'mobile-admin-product-editor');
  await m.close();
});

await step('security: private pages are not indexable/cacheable; admin pages noindex', async () => {
  const r = await page.request.get(`${BASE}/fr/my-orders`); ok(/noindex/.test(r.headers()['x-robots-tag'] ?? ''), 'my-orders noindex');
  const a = await admin.request.get(`${BASE}/admin/orders`); ok(/noindex/.test(a.headers()['x-robots-tag'] ?? ''), 'admin noindex');
  const rb = await page.request.get(`${BASE}/robots.txt`); ok(/Disallow: \//.test(await rb.text()), 'demo robots disallows everything');
});

await browser.close();
fs.writeFileSync('docs/E2E_RESULTS.md', `# E2E results\n\nRun against ${BASE} on ${new Date().toISOString()}\n\n| Step | Result |\n|---|---|\n${results.map(([n, r]) => `| ${n} | ${r} |`).join('\n')}\n`);
const failed = results.filter(([, r]) => r !== 'PASS');
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
