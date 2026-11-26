// Captures the required storefront + admin screenshots against BASE (default http://localhost:3100)
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const BASE = process.env.BASE ?? 'http://localhost:3100';
const OUT = 'screenshots';
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();

async function scrollAll(p) {
  await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } window.scrollTo(0, 0); });
  await p.waitForTimeout(500);
}
async function shot(p, name, full = true) { await scrollAll(p); await p.screenshot({ path: `${OUT}/${name}.png`, fullPage: full }); console.log('shot', name); }

// ───── storefront ─────
async function storefront(width, height, suffix) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/fr`, { waitUntil: 'networkidle' }); await shot(p, `home-${suffix}`);
  if (suffix === 'desktop') {
    await p.goto(`${BASE}/fr/baskets`, { waitUntil: 'networkidle' }); await shot(p, 'catalog');
    await p.goto(`${BASE}/fr/baskets/reveillon`, { waitUntil: 'networkidle' }); await shot(p, 'product');
    await p.goto(`${BASE}/en`, { waitUntil: 'networkidle' }); await shot(p, 'home-en');
    // builder
    await p.goto(`${BASE}/fr/build`, { waitUntil: 'networkidle' });
    await p.getByRole('button', { name: /Panier moyen/ }).click(); await shot(p, 'build-1');
    await p.getByRole('button', { name: /Continuer/ }).click();
    for (const n of ['Chocolats assortis', 'Chocolats assortis']) await p.getByRole('button', { name: `Ajouter ${n}` }).first().click();
    await shot(p, 'build-2');
    await p.getByRole('button', { name: /Continuer/ }).click(); await shot(p, 'build-3');
    await p.getByRole('button', { name: /récapitulatif/ }).click(); await shot(p, 'build-4');
    await p.getByRole('button', { name: /Ajouter au panier/ }).click(); await p.waitForURL('**/cart'); await p.waitForTimeout(1200);
    // add ready-made too
    await p.goto(`${BASE}/fr/baskets/douceurs`, { waitUntil: 'networkidle' }); await p.getByRole('button', { name: 'Ajouter au panier' }).click();
    await p.goto(`${BASE}/fr/cart`, { waitUntil: 'networkidle' }); await p.getByLabel(/Code postal/).fill('H9R 1A1'); await p.waitForTimeout(1200); await shot(p, 'cart');
    await p.goto(`${BASE}/fr/checkout`, { waitUntil: 'networkidle' }); await p.waitForTimeout(800); await shot(p, 'checkout');
    await p.goto(`${BASE}/fr/track`, { waitUntil: 'networkidle' }); await shot(p, 'track');
    await p.goto(`${BASE}/fr/my-orders`, { waitUntil: 'networkidle' }); await shot(p, 'verify-form');
  }
  await ctx.close();
}
await storefront(1440, 900, 'desktop');
await storefront(390, 844, 'mobile');
await browser.close();
