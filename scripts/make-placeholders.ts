/* Generates clearly-labelled TEMPORARY placeholder images at the exact paths the app expects.
   Replace any file with the real generated image (same path) or upload a new one from the admin. */
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { IMAGES } from '../src/data/image-manifest';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

function bokeh(w: number, h: number, seed: number) {
  let s = seed;
  const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  return Array.from({ length: 38 }, () => `<circle cx="${(0.35 + r() * 0.65) * w}" cy="${r() * h}" r="${(0.008 + r() * 0.03) * w}" fill="#F4CE83" opacity="${0.12 + r() * 0.5}"/>`).join('');
}

function html(a: (typeof IMAGES)[number], i: number) {
  const dark = a.group === 'hero' || a.group === 'collection';
  const bg = dark ? 'radial-gradient(ellipse at 75% 45%, #1E5A44 0%, #0A3326 45%, #031B14 100%)' : 'linear-gradient(160deg,#FAF5EC 0%,#F2E6D4 100%)';
  const u = Math.min(a.w, a.h);
  const basket = dark
    ? `<svg style="position:absolute;right:${a.w > a.h ? '8%' : '12%'};bottom:${a.w > a.h ? '8%' : '6%'};height:${a.w > a.h ? '78%' : '48%'}" viewBox="0 0 400 420">
        <path d="M70 150 Q200 -20 330 150" fill="none" stroke="#111" stroke-width="14"/><ellipse cx="200" cy="170" rx="150" ry="40" fill="#111"/>
        <rect x="60" y="160" width="280" height="40" fill="#0b0b0b"/><path d="M60 200 L90 380 Q200 410 310 380 L340 200 Z" fill="#161616"/>
        <rect x="120" y="70" width="70" height="90" fill="#8A1730"/><rect x="200" y="60" width="90" height="100" fill="#D4A64D"/><circle cx="160" cy="140" r="30" fill="#F4CE83"/>
        <path d="M200 215 q-70 -50 -110 -10 q40 50 110 10 q70 40 110 -10 q-40 -40 -110 10z" fill="#0E4A33" stroke="#D4A64D" stroke-width="3"/></svg>` : '';
  const mono = !dark ? `<div style="font-family:'Pinyon Script',cursive;color:#D4A64D;font-size:${u * 0.32}px;line-height:1">ED</div>` : '';
  return `<html><head><style>@font-face{font-family:'Pinyon Script';src:local('Pinyon Script')}
  body{margin:0;width:${a.w}px;height:${a.h}px;background:${bg};position:relative;overflow:hidden;font-family:Georgia,serif}
  .tag{position:absolute;left:${u * 0.04}px;bottom:${u * 0.04}px;color:${dark ? '#F4CE83' : '#62645D'};font:${Math.max(14, u * 0.022)}px/1.2 sans-serif;letter-spacing:.12em;text-transform:uppercase}
  .center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${u * 0.02}px;text-align:center;padding:0 8%}
  .label{font-size:${u * (dark ? 0.045 : 0.06)}px;color:${dark ? '#F4CE83' : '#06271E'};font-weight:600}
  .frame{position:absolute;inset:${u * 0.03}px;border:2px solid ${dark ? 'rgba(212,166,77,.45)' : 'rgba(212,166,77,.8)'}}</style></head><body>
  ${dark ? `<svg style="position:absolute;inset:0" width="${a.w}" height="${a.h}">${bokeh(a.w, a.h, i + 3)}</svg>` : ''}${basket}
  ${!dark ? '<div class="frame"></div>' : ''}
  <div class="center" style="${dark && a.w > a.h ? 'justify-content:flex-end;align-items:flex-start;padding-bottom:12%' : dark ? 'justify-content:flex-end;padding-bottom:6%' : ''}">${mono}${dark ? '' : `<div class="label">${a.label}</div>`}</div>
  <div class="tag">Image temporaire · ${a.label}</div></body></html>`;
}

(async () => {
  const browser = await chromium.launch();
  let n = 0;
  for (const [i, a] of IMAGES.entries()) {
    const out = path.resolve(a.file);
    if (fs.existsSync(out) && !process.argv.includes('--force')) continue;
    fs.mkdirSync(path.dirname(out), { recursive: true });
    const page = await browser.newPage({ viewport: { width: a.w, height: a.h } });
    await page.setContent(html(a, i));
    await page.screenshot({ path: out, type: 'jpeg', quality: 82 });
    await page.close();
    n++;
  }
  await browser.close();
  console.log(`placeholders written: ${n}`);
})();
