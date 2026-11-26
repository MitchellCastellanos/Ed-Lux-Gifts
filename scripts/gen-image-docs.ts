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

// ── prompts-only .md (skill format) + mobile HTML / PDF built by the shared script ──
const promptsMd = `# ED LUX GIFTS — Prompts de imágenes\n\n${chunks.length} lotes · ${IMAGES.length} imágenes. Generado desde \`src/data/image-manifest.ts\` (\`npx tsx scripts/gen-image-docs.ts\`).\n` + md.slice(md.indexOf('\nLOTE 1 DE'));
fs.writeFileSync('docs/IMAGE_PROMPTS.md', promptsMd);
import { execFileSync } from 'child_process';
execFileSync('node', ['scripts/build-prompt-docs.mjs', 'docs/IMAGE_PROMPTS.md', '--project', 'ED LUX GIFTS'], { stdio: 'inherit' });
