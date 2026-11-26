/* Generates docs/IMAGE_ASSETS.md from src/data/image-manifest.ts using the image-prompts skill format (batches of max 7, one block per batch). */
import fs from 'fs';
import { IMAGES } from '../src/data/image-manifest';

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
const ratio = (w: number, h: number) => { const g = gcd(w, h); return `${w / g}:${h / g}`; };

const STYLE = 'Fotografía de producto y de estilo de vida premium para una boutique elegante de canastas de regalo (Pointe-Claire, Québec), tomada con cámara real, no ilustración ni render 3D. Luz cálida dorada y suave, sombras delicadas, profundidad de campo moderada. Paleta permanente: verde esmeralda profundo (#06271E / #031B14), dorado (#D4A64D) y champán/marfil (#F2E6D4 / #FAF5EC); el rojo borgoña (#8A1730) solo como acento navideño puntual. Materiales realistas y refinados: mimbre trenzado negro o miel, satén esmeralda con borde dorado, vidrio facetado dorado, cartón rígido, cacao, galletas, velas. Para los productos del catálogo, usa siempre el mismo ángulo de cámara (vista de tres cuartos, ligeramente elevada, sujeto centrado) y composición limpia con mucho aire. Las imágenes de héroe y de tarjetas deben dejar un espacio negativo claro y despejado para superponer texto HTML. Todas las marcas, etiquetas y envases son ficticios, sin texto legible, sin logotipos reales y sin marcas comerciales. Nunca incluyas botellas de alcohol; usa únicamente alternativas sin alcohol. Sin texto, sin botones, sin elementos de interfaz web, sin marcas de agua, sin manos ni personas. Si adjuntas la maqueta aprobada del sitio, úsala solo como referencia de ambiente y estilo, sin copiar sus marcas reales. Respeta la relación de aspecto indicada en cada imagen.';

const chunks: (typeof IMAGES)[] = [];
for (let i = 0; i < IMAGES.length; i += 7) chunks.push(IMAGES.slice(i, i + 7));

let md = `# Image assets

All storefront photography is **generated externally** (the build environment has no image generator) and then dropped into \`public/images/...\` **at the exact path below** — no code change needed. Every file currently in the repo is a clearly labelled **temporary placeholder** ("Image temporaire") produced by \`npx tsx scripts/make-placeholders.ts\`. Any image can also be replaced from the admin (product, base, collection and campaign editors upload to Cloudinary/local storage and store the URL instead).

Prompts follow the **\`image-prompts\` skill** format (batches of at most 7, one self-contained block per batch, pasted into a fresh ChatGPT conversation). The skill produces Spanish wrapper text; the per-image descriptions are written in French because that is the brand language of the scenes. Regenerate this file after editing \`src/data/image-manifest.ts\` with \`npx tsx scripts/gen-image-docs.ts\`.

**Important**
- Generated demo images are *concept imagery*, not photographs of the owner's real inventory — replace them with real photos when available (see \`docs/PRODUCTION_CHECKLIST.md\`).
- The approved mockup shows champagne and real brand names (e.g. chocolate brands). The prompts deliberately use **non-alcoholic** drinks and **fictional brands** until the owner confirms products and legal requirements.
- Logo/monogram: rendered in code (script font + SVG icon, \`src/components/Logo.tsx\`); no image file is required. A vector/PNG logo can be supplied later.
- Reference images to attach when generating: the approved homepage mockup (all hero/card images) and the owner's original business photos (all product images, where applicable).

## Asset manifest

| # | File | Directory | Size (ratio) | UI placement | Visual purpose | References |
|---|---|---|---|---|---|---|
`;
IMAGES.forEach((a, i) => {
  const parts = a.file.split('/');
  md += `| ${i + 1} | \`${parts.pop()}\` | \`${parts.join('/')}/\` | ${a.w}×${a.h} (${ratio(a.w, a.h)}) | ${a.placement} | ${a.purpose} | ${a.refs ?? 'Approved mockup style; owner photos if available'} |\n`;
});

md += `\n## Generation prompts\n\n${IMAGES.length} images in ${chunks.length} batches.\n`;
chunks.forEach((c, bi) => {
  const n = c.length;
  md += `\nLOTE ${bi + 1} DE ${chunks.length}\n\n\`\`\`\n`;
  const project = 'ED LUX GIFTS';
  const convName = `Batch ${bi + 1}/${chunks.length} - ${project}`;
  md += `PRIMERO, antes de hacer cualquier otra cosa: esta conversación debe llamarse exactamente «${convName}». Renómbrala (o titúlala) así ahora mismo. Si no puedes renombrarla tú mismo, escribe en tu primera respuesta: «Por favor renombra esta conversación como: ${convName}».\n\n`;
  md += `Vas a generar ${n} imágenes para el sitio web de ${project}, una boutique de canastas de regalo en Pointe-Claire (Québec). Te voy a dar las ${n} descripciones de una vez, pero quiero que las generes de UNA EN UNA: genera solo la primera ahora y espera. Cuando yo escriba "siguiente", genera la imagen 2, y así sucesivamente hasta terminar las ${n}. No generes más de una imagen por turno.\n\n`;
  md += `REGLA OBLIGATORIA, MUY IMPORTANTE — NOMBRE Y RUTA DE CADA IMAGEN: cada imagen tiene un archivo con su ruta exacta (la línea «archivo:»). CADA VEZ que me entregues una imagen, tu mensaje DEBE incluir, justo encima o justo debajo de la imagen, esta línea copiada letra por letra de la lista: «Archivo: <ruta completa/nombre.ext>» (por ejemplo, «Archivo: public/images/hero/hero-christmas-desktop.jpg»). Nunca entregues una imagen sin su nombre y su ruta. No abrevies la ruta, no la cambies, no la traduzcas, no inventes otro nombre y no la omitas aunque la imagen sea parecida a otra. Si alguna vez olvidas poner el nombre y la ruta, yo te lo recordaré y deberás repetir el mensaje con la línea «Archivo: …» correcta. Antes de enviar cada respuesta, verifica que la línea «Archivo: …» está presente.\n\n`;
  md += `Estilo visual que deben compartir las ${n} (aplícalo a todas): ${STYLE}\n\n`;
  c.forEach((a, i) => {
    const body = a.prompt.replace(/^(Panorámica|Format panoramique|Format portrait|Format)\s*[\d:]+\.\s*/, '');
    md += `IMAGEN ${i + 1} — archivo: ${a.file}\n(Al entregarla escribe: «Archivo: ${a.file}»). Formato ${ratio(a.w, a.h)} (${a.w}×${a.h} px). ${body}\n\n`;
  });
  md += `Empieza generando solo la IMAGEN 1 y espera mi "siguiente".\n\`\`\`\n`;
});
fs.writeFileSync('docs/IMAGE_ASSETS.md', md);
console.log('docs/IMAGE_ASSETS.md written', md.length, 'chars');

// ── mobile-friendly document (HTML with copy buttons) ──
const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const blocks = [...md.matchAll(/LOTE (\d+) DE (\d+)\n\n```\n([\s\S]*?)```/g)].map((m) => ({ n: m[1], total: m[2], text: m[3].trim() }));
const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ED LUX GIFTS — Prompts de imágenes</title>
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
<header><h1>ED LUX GIFTS — Prompts de imágenes</h1><p>${blocks.length} lotes · ${IMAGES.length} imágenes</p></header>
<main>
<div class="tip"><b>Cómo usarlo</b><ol><li>Abre un chat <b>nuevo</b> en ChatGPT por cada lote.</li><li>Toca <b>Copiar lote</b> y pégalo.</li><li>Cuando termine una imagen, escribe <b>siguiente</b>.</li><li>Cada imagen debe llegar con su línea <b>«Archivo: ruta/nombre»</b>; si falta, pídesela.</li><li>Adjunta la maqueta y tus fotos reales como referencia.</li></ol></div>
${blocks.map((b) => `<section class="batch"><h2>Batch ${b.n}/${b.total} - ED LUX GIFTS <small>${(b.text.match(/^IMAGEN /gm) ?? []).length} imágenes</small></h2><button type="button" onclick="cp(this,'b${b.n}')">Copiar lote ${b.n}</button><pre id="b${b.n}">${esc(b.text)}</pre></section>`).join('\n')}
</main>
<script>function cp(btn,id){var t=document.getElementById(id).innerText;var done=function(){btn.textContent='¡Copiado!';btn.className='ok';setTimeout(function(){btn.textContent='Copiar lote '+id.slice(1);btn.className=''},2000)};if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(t).then(done)}else{var a=document.createElement('textarea');a.value=t;document.body.appendChild(a);a.select();document.execCommand('copy');a.remove();done()}}</script>
</body></html>`;
fs.writeFileSync('docs/IMAGE_PROMPTS.html', html);
console.log('docs/IMAGE_PROMPTS.html written');
