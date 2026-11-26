import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const BASE = process.env.BASE ?? 'http://localhost:3100';
const widths = [320, 375, 390, 768];
const paths = process.argv.slice(2);
const b = await chromium.launch();
let bad = 0;
for (const w of widths) {
  const ctx = await b.newContext({ viewport: { width: w, height: 800 } });
  const p = await ctx.newPage();
  for (const path of paths) {
    await p.goto(BASE + path, { waitUntil: 'networkidle' });
    const r = await p.evaluate((w) => {
      const sw = document.documentElement.scrollWidth;
      const offenders = [...document.querySelectorAll('body *')].filter((e) => { const b = e.getBoundingClientRect(); return b.right > w + 1 && b.width > 0 && getComputedStyle(e).position !== 'fixed'; }).slice(0, 4).map((e) => `${e.tagName}.${String(e.className).slice(0, 60)} r=${Math.round(e.getBoundingClientRect().right)}`);
      return { sw, offenders };
    }, w);
    if (r.sw > w) { bad++; console.log(w, path, 'scrollWidth', r.sw, r.offenders); }
  }
  await ctx.close();
}
await b.close();
console.log(bad ? `${bad} overflow cases` : 'no horizontal overflow');
