#!/usr/bin/env node
// Builds the mobile-friendly HTML (with "Copiar lote" buttons) and the PDF from a prompts .md written in the image-prompts skill format.
// usage: node build-prompt-docs.mjs <prompts.md> --project "Nombre del proyecto" [--no-pdf]
// Output: <prompts>.html and <prompts>.pdf next to the .md (same basename).
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const args = process.argv.slice(2);
const mdPath = args.find((a) => !a.startsWith('--') && a.endsWith('.md'));
if (!mdPath) { console.error('usage: build-prompt-docs.mjs <prompts.md> --project "Name" [--no-pdf]'); process.exit(1); }
const pi = args.indexOf('--project');
const md = fs.readFileSync(mdPath, 'utf8');
const project = (pi >= 0 ? args[pi + 1] : null) ?? (md.match(/^#\s+(.+?)\s+—/m)?.[1]) ?? 'Proyecto';

const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const blocks = [...md.matchAll(/LOTE (\d+) DE (\d+)\n\n```\n([\s\S]*?)```/g)].map((m) => ({ n: m[1], total: m[2], text: m[3].trim() }));
if (!blocks.length) { console.error('No "LOTE n DE N" + ``` blocks found in', mdPath); process.exit(1); }
const imageCount = blocks.reduce((s, b) => s + (b.text.match(/^IMAGEN /gm) ?? []).length, 0);

const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(project)} — Prompts de imágenes</title>
<style>
:root{--em:#06271E;--gold:#D4A64D;--iv:#FAF5EC;--ink:#18231D}
*{box-sizing:border-box}body{margin:0;background:var(--iv);color:var(--ink);font:16px/1.5 system-ui,-apple-system,Segoe UI,sans-serif}
header{background:var(--em);color:#F4CE83;padding:20px 16px}header h1{margin:0;font:600 22px Georgia,serif}header p{margin:6px 0 0;color:#fff;font-size:14px}
main{padding:16px;max-width:760px;margin:auto}.tip{background:#fff;border:1px solid #E4CFA0;border-left:4px solid var(--gold);padding:12px 14px;border-radius:6px;font-size:15px}
.tip ol{margin:6px 0 0 18px;padding:0}.batch{background:#fff;border:1px solid #E4CFA0;border-radius:8px;margin:18px 0;overflow:hidden}
.batch h2{margin:0;padding:12px 14px;background:#F2E6D4;font:600 18px Georgia,serif;display:flex;justify-content:space-between;align-items:center;gap:10px}
.batch h2 small{font:500 13px system-ui;color:#62645D}button{min-height:48px;width:100%;border:0;background:var(--em);color:#fff;font:600 16px system-ui;padding:12px;cursor:pointer}
button.ok{background:#2d7a4f}pre{margin:0;padding:14px;white-space:pre-wrap;word-wrap:break-word;font:13.5px/1.55 ui-monospace,Menlo,Consolas,monospace;max-height:340px;overflow:auto}
@media print{button{display:none}pre{max-height:none}.batch{break-inside:auto}}
</style></head><body>
<header><h1>${esc(project)} — Prompts de imágenes</h1><p>${blocks.length} lotes · ${imageCount} imágenes</p></header>
<main>
<div class="tip"><b>Cómo usarlo</b><ol><li>Abre un chat <b>nuevo</b> en ChatGPT por cada lote.</li><li>Toca <b>Copiar lote</b> y pégalo.</li><li>Cuando termine una imagen, escribe <b>siguiente</b>.</li><li>Cada imagen debe llegar con su línea <b>«Archivo: ruta/nombre»</b>; si falta, pídesela.</li><li>Adjunta la maqueta y tus fotos reales como referencia.</li></ol></div>
${blocks.map((b) => `<section class="batch"><h2>Batch ${b.n}/${b.total} - ${esc(project)} <small>${(b.text.match(/^IMAGEN /gm) ?? []).length} imágenes</small></h2><button type="button" onclick="cp(this,'b${b.n}')">Copiar lote ${b.n}</button><pre id="b${b.n}">${esc(b.text)}</pre></section>`).join('\n')}
</main>
<script>function cp(btn,id){var t=document.getElementById(id).innerText;var done=function(){btn.textContent='¡Copiado!';btn.className='ok';setTimeout(function(){btn.textContent='Copiar lote '+id.slice(1);btn.className=''},2000)};if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(t).then(done)}else{var a=document.createElement('textarea');a.value=t;document.body.appendChild(a);a.select();document.execCommand('copy');a.remove();done()}}</script>
</body></html>`;

const base = mdPath.replace(/\.md$/, '');
fs.writeFileSync(`${base}.html`, html);
console.log(`wrote ${base}.html (${blocks.length} batches, ${imageCount} images)`);

if (!args.includes('--no-pdf')) {
  const tries = ['playwright', '/opt/node-tools/node_modules/playwright', path.join(process.cwd(), 'node_modules/playwright')];
  let chromium;
  for (const t of tries) { try { chromium = createRequire(import.meta.url)(t).chromium; break; } catch {} }
  if (!chromium) { console.error('PDF skipped: Playwright/Chromium not found (the HTML was still written).'); process.exit(0); }
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto('file://' + path.resolve(`${base}.html`));
  await page.emulateMedia({ media: 'print' });
  await page.pdf({ path: `${base}.pdf`, width: '120mm', height: '210mm', margin: { top: '8mm', bottom: '8mm', left: '6mm', right: '6mm' }, printBackground: true });
  await browser.close();
  console.log(`wrote ${base}.pdf`);
}
