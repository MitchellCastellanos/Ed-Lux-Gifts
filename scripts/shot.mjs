// usage: node scripts/shot.mjs <url> <out.png> [width] [height] [fullPage]
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const [url, out, w = '1440', h = '900', full = '1'] = process.argv.slice(2);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
await p.goto(url, { waitUntil: 'networkidle' });
await p.evaluate(async()=>{for(let y=0;y<document.body.scrollHeight;y+=500){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,80));}window.scrollTo(0,0);});
await p.waitForTimeout(600);
await p.screenshot({ path: out, fullPage: full === '1' });
await b.close();
