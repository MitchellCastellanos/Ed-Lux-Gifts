# Image assets

All storefront photography is **generated externally** (the build environment has no image generator) and then dropped into `public/images/...` **at the exact path below** — no code change needed. Every file currently in the repo is a clearly labelled **temporary placeholder** ("Image temporaire") produced by `npx tsx scripts/make-placeholders.ts`. Any image can also be replaced from the admin (product, base, collection and campaign editors upload to Cloudinary/local storage and store the URL instead).

Prompts follow the **`image-prompts` skill** format (batches of at most 7, one self-contained block per batch, pasted into a fresh ChatGPT conversation). The skill produces Spanish wrapper text; the per-image descriptions are written in French because that is the brand language of the scenes. Regenerate this file after editing `src/data/image-manifest.ts` with `npx tsx scripts/gen-image-docs.ts`.

**Important**
- Generated demo images are *concept imagery*, not photographs of the owner's real inventory — replace them with real photos when available (see `docs/PRODUCTION_CHECKLIST.md`).
- The approved mockup shows champagne and real brand names (e.g. chocolate brands). The prompts deliberately use **non-alcoholic** drinks and **fictional brands** until the owner confirms products and legal requirements.
- Logo/monogram: rendered in code (script font + SVG icon, `src/components/Logo.tsx`); no image file is required. A vector/PNG logo can be supplied later.
- Reference images to attach when generating: the approved homepage mockup (all hero/card images) and the owner's original business photos (all product images, where applicable).

## Asset manifest

| # | File | Directory | Size (ratio) | UI placement | Visual purpose | References |
|---|---|---|---|---|---|---|
| 1 | `hero-christmas-desktop.jpg` | `public/images/hero/` | 2400×1000 (12:5) | Homepage hero, desktop (≥768px) | Christmas campaign banner | Maqueta aprobada (hero) + fotos reales del negocio |
| 2 | `hero-christmas-mobile.jpg` | `public/images/hero/` | 1080×1350 (4:5) | Homepage hero, mobile | Christmas campaign banner (portrait crop) | hero-christmas-desktop.jpg |
| 3 | `hero-evergreen-desktop.jpg` | `public/images/hero/` | 2400×1000 (12:5) | Homepage hero when no campaign is active | Neutral evergreen fallback hero | Approved mockup style; owner photos if available |
| 4 | `hero-evergreen-mobile.jpg` | `public/images/hero/` | 1080×1350 (4:5) | Homepage hero when no campaign is active, mobile | Neutral evergreen fallback hero (portrait) | hero-evergreen-desktop.jpg |
| 5 | `path-ready-made.jpg` | `public/images/cards/` | 1200×900 (4:3) | Homepage shopping path A (Paniers prédéfinis) | Ready-made baskets card photo | Approved mockup style; owner photos if available |
| 6 | `path-custom.jpg` | `public/images/cards/` | 1200×900 (4:3) | Homepage shopping path B (Créez votre propre panier) | Build-your-own card photo | Approved mockup style; owner photos if available |
| 7 | `collection-christmas.jpg` | `public/images/collections/` | 1600×900 (16:9) | Collection cover | Christmas collection cover | Approved mockup style; owner photos if available |
| 8 | `panier-reveillon.jpg` | `public/images/products/` | 1200×1500 (4:5) | Catalog / product page | Premium curated basket | Approved mockup style; owner photos if available |
| 9 | `panier-douceurs-noel.jpg` | `public/images/products/` | 1200×1500 (4:5) | Catalog / product page | Sweet-treats curated basket | Approved mockup style; owner photos if available |
| 10 | `panier-cafe-the.jpg` | `public/images/products/` | 1200×1500 (4:5) | Catalog / product page | Coffee & tea curated basket | Approved mockup style; owner photos if available |
| 11 | `panier-chaleureux.jpg` | `public/images/products/` | 1200×1500 (4:5) | Catalog / product page | Cozy evening curated basket | Approved mockup style; owner photos if available |
| 12 | `panier-petit-cadeau.jpg` | `public/images/products/` | 1200×1500 (4:5) | Catalog / product page | Small gift curated basket | Approved mockup style; owner photos if available |
| 13 | `panier-prestige.jpg` | `public/images/products/` | 1200×1500 (4:5) | Catalog / product page | Large prestige curated basket | Approved mockup style; owner photos if available |
| 14 | `base-small.jpg` | `public/images/bases/` | 1200×1200 (1:1) | Builder step 1 | Small basket base | Approved mockup style; owner photos if available |
| 15 | `base-medium.jpg` | `public/images/bases/` | 1200×1200 (1:1) | Builder step 1 | Medium basket base | Approved mockup style; owner photos if available |
| 16 | `base-large.jpg` | `public/images/bases/` | 1200×1200 (1:1) | Builder step 1 | Large basket base | Approved mockup style; owner photos if available |
| 17 | `chocolats-assortis.jpg` | `public/images/items/` | 900×900 (1:1) | Builder / inventory | Assorted chocolates box | Approved mockup style; owner photos if available |
| 18 | `truffes-noires.jpg` | `public/images/items/` | 900×900 (1:1) | Builder / inventory | Dark chocolate truffles | Approved mockup style; owner photos if available |
| 19 | `bonbons-noel.jpg` | `public/images/items/` | 900×900 (1:1) | Builder / inventory | Christmas candy | Approved mockup style; owner photos if available |
| 20 | `biscuits-beurre.jpg` | `public/images/items/` | 900×900 (1:1) | Builder / inventory | Butter cookies tin | Approved mockup style; owner photos if available |
| 21 | `biscuits-decores.jpg` | `public/images/items/` | 900×900 (1:1) | Builder / inventory | Decorated cookies | Approved mockup style; owner photos if available |
| 22 | `caramel-popcorn.jpg` | `public/images/items/` | 900×900 (1:1) | Builder / inventory | Caramel popcorn | Approved mockup style; owner photos if available |
| 23 | `cafe-moulu.jpg` | `public/images/items/` | 900×900 (1:1) | Builder / inventory | Ground coffee | Approved mockup style; owner photos if available |
| 24 | `the-assortis.jpg` | `public/images/items/` | 900×900 (1:1) | Builder / inventory | Tea assortment | Approved mockup style; owner photos if available |
| 25 | `chocolat-chaud.jpg` | `public/images/items/` | 900×900 (1:1) | Builder / inventory | Hot chocolate mix | Approved mockup style; owner photos if available |
| 26 | `cidre-pomme.jpg` | `public/images/items/` | 900×900 (1:1) | Builder / inventory | Sparkling apple cider (non-alcoholic) | Approved mockup style; owner photos if available |
| 27 | `jus-raisin.jpg` | `public/images/items/` | 900×900 (1:1) | Builder / inventory | Sparkling grape juice (non-alcoholic) | Approved mockup style; owner photos if available |
| 28 | `bougie-doree.jpg` | `public/images/items/` | 900×900 (1:1) | Builder / inventory | Gold candle | Approved mockup style; owner photos if available |
| 29 | `bougie-sapin.jpg` | `public/images/items/` | 900×900 (1:1) | Builder / inventory | Pine candle | Approved mockup style; owner photos if available |
| 30 | `thermos-noir.jpg` | `public/images/items/` | 900×900 (1:1) | Builder / inventory | Black insulated tumbler | Approved mockup style; owner photos if available |
| 31 | `coussin-chauffant.jpg` | `public/images/items/` | 900×900 (1:1) | Builder / inventory | Heating pad plush | Approved mockup style; owner photos if available |
| 32 | `boule-doree.jpg` | `public/images/items/` | 900×900 (1:1) | Builder / inventory | Gold ornaments | Approved mockup style; owner photos if available |
| 33 | `ornement-sapin.jpg` | `public/images/items/` | 900×900 (1:1) | Builder / inventory | Tree ornament | Approved mockup style; owner photos if available |
| 34 | `noix-confites.jpg` | `public/images/items/` | 900×900 (1:1) | Builder / inventory | Candied nuts | Approved mockup style; owner photos if available |
| 35 | `option-wrap.jpg` | `public/images/options/` | 900×900 (1:1) | Builder step 3 | Gift wrapping | Approved mockup style; owner photos if available |
| 36 | `option-ribbon.jpg` | `public/images/options/` | 900×900 (1:1) | Builder step 3 | Premium ribbon | Approved mockup style; owner photos if available |
| 37 | `option-decor.jpg` | `public/images/options/` | 900×900 (1:1) | Builder step 3 | Decorative elements | Approved mockup style; owner photos if available |
| 38 | `option-card.jpg` | `public/images/options/` | 900×900 (1:1) | Builder step 3 | Greeting card | Approved mockup style; owner photos if available |

## Generation prompts

38 images in 6 batches.

LOTE 1 DE 6

```
Vas a generar 7 imágenes para el sitio web de ED LUX GIFTS, una boutique de canastas de regalo en Pointe-Claire (Québec). Te voy a dar las 7 descripciones de una vez, pero quiero que las generes de UNA EN UNA: genera solo la primera ahora y espera. Cuando yo escriba "siguiente", genera la imagen 2, y así sucesivamente hasta terminar las 7. No generes más de una imagen por turno.

Estilo visual que deben compartir las 7 (aplícalo a todas): Fotografía de producto y de estilo de vida premium para una boutique elegante de canastas de regalo (Pointe-Claire, Québec), tomada con cámara real, no ilustración ni render 3D. Luz cálida dorada y suave, sombras delicadas, profundidad de campo moderada. Paleta permanente: verde esmeralda profundo (#06271E / #031B14), dorado (#D4A64D) y champán/marfil (#F2E6D4 / #FAF5EC); el rojo borgoña (#8A1730) solo como acento navideño puntual. Materiales realistas y refinados: mimbre trenzado negro o miel, satén esmeralda con borde dorado, vidrio facetado dorado, cartón rígido, cacao, galletas, velas. Para los productos del catálogo, usa siempre el mismo ángulo de cámara (vista de tres cuartos, ligeramente elevada, sujeto centrado) y composición limpia con mucho aire. Las imágenes de héroe y de tarjetas deben dejar un espacio negativo claro y despejado para superponer texto HTML. Todas las marcas, etiquetas y envases son ficticios, sin texto legible, sin logotipos reales y sin marcas comerciales. Nunca incluyas botellas de alcohol; usa únicamente alternativas sin alcohol. Sin texto, sin botones, sin elementos de interfaz web, sin marcas de agua, sin manos ni personas. Si adjuntas la maqueta aprobada del sitio, úsala solo como referencia de ambiente y estilo, sin copiar sus marcas reales. Respeta la relación de aspecto indicada en cada imagen.

IMAGEN 1 — archivo: public/images/hero/hero-christmas-desktop.jpg
Formato 12:5 (2400×1000 px). Un elegante panier-cadeau noir tressé, orné d’un grand ruban de satin vert émeraude à bordure dorée, rempli de boîtes de chocolats, de biscuits au beurre dans une boîte ronde dorée, d’un pot de caramel, d’un thermos noir mat, d’une bougie dorée en verre facetté et de branches de sapin avec baies rouges. Aucune bouteille d’alcool. Le panier occupe le tiers droit de l’image, sur une table en bois sombre; fond de lumières bokeh dorées et de sapin. Le côté gauche, environ 45 % de l’image, reste un fond vert émeraude profond, doux et dégagé pour superposer du texte.

IMAGEN 2 — archivo: public/images/hero/hero-christmas-mobile.jpg
Formato 4:5 (1080×1350 px). Même panier-cadeau de Noël que la bannière horizontale, cadré dans la moitié inférieure de l’image, sur une table en bois sombre avec lumières bokeh dorées au fond. La moitié supérieure reste un fond vert émeraude profond et dégagé, avec seulement quelques branches de sapin discrètes sur les bords, pour superposer du texte.

IMAGEN 3 — archivo: public/images/hero/hero-evergreen-desktop.jpg
Formato 12:5 (2400×1000 px). Panier-cadeau tressé élégant sans décor saisonnier, ruban de satin vert émeraude, chocolats, biscuits, bougie dorée et thé en boîte, sur une table en bois sombre. Lumière chaude dorée, fond émeraude très sombre légèrement flou. Le panier occupe le tiers droit; le côté gauche reste un fond émeraude dégagé pour du texte.

IMAGEN 4 — archivo: public/images/hero/hero-evergreen-mobile.jpg
Formato 4:5 (1080×1350 px). Le même panier-cadeau neutre, cadré dans la moitié inférieure, fond émeraude sombre flou; la moitié supérieure reste dégagée pour du texte.

IMAGEN 5 — archivo: public/images/cards/path-ready-made.jpg
Formato 4:3 (1200×900 px). Panier-cadeau noir tressé garni de chocolats, biscuits et bougie, ruban vert émeraude et or, branches de sapin et boules dorées autour, fond bokeh doré chaleureux. Sujet à gauche-centre, espace libre à droite.

IMAGEN 6 — archivo: public/images/cards/path-custom.jpg
Formato 4:3 (1200×900 px). Panier en osier doré vide, garni de paille dorée, à côté d’une bobine de ruban rouge et or, d’une pomme de pin et de branches de sapin; fond bokeh doré chaleureux. Sujet à gauche-centre, espace libre à droite.

IMAGEN 7 — archivo: public/images/collections/collection-christmas.jpg
Formato 16:9 (1600×900 px). Composition de Noël : plusieurs paniers-cadeaux élégants alignés sur une table en bois sombre devant des lumières bokeh dorées et des branches de sapin; rubans émeraude et or.

Empieza generando solo la IMAGEN 1 y espera mi "siguiente".
```

LOTE 2 DE 6

```
Vas a generar 7 imágenes para el sitio web de ED LUX GIFTS, una boutique de canastas de regalo en Pointe-Claire (Québec). Te voy a dar las 7 descripciones de una vez, pero quiero que las generes de UNA EN UNA: genera solo la primera ahora y espera. Cuando yo escriba "siguiente", genera la imagen 2, y así sucesivamente hasta terminar las 7. No generes más de una imagen por turno.

Estilo visual que deben compartir las 7 (aplícalo a todas): Fotografía de producto y de estilo de vida premium para una boutique elegante de canastas de regalo (Pointe-Claire, Québec), tomada con cámara real, no ilustración ni render 3D. Luz cálida dorada y suave, sombras delicadas, profundidad de campo moderada. Paleta permanente: verde esmeralda profundo (#06271E / #031B14), dorado (#D4A64D) y champán/marfil (#F2E6D4 / #FAF5EC); el rojo borgoña (#8A1730) solo como acento navideño puntual. Materiales realistas y refinados: mimbre trenzado negro o miel, satén esmeralda con borde dorado, vidrio facetado dorado, cartón rígido, cacao, galletas, velas. Para los productos del catálogo, usa siempre el mismo ángulo de cámara (vista de tres cuartos, ligeramente elevada, sujeto centrado) y composición limpia con mucho aire. Las imágenes de héroe y de tarjetas deben dejar un espacio negativo claro y despejado para superponer texto HTML. Todas las marcas, etiquetas y envases son ficticios, sin texto legible, sin logotipos reales y sin marcas comerciales. Nunca incluyas botellas de alcohol; usa únicamente alternativas sin alcohol. Sin texto, sin botones, sin elementos de interfaz web, sin marcas de agua, sin manos ni personas. Si adjuntas la maqueta aprobada del sitio, úsala solo como referencia de ambiente y estilo, sin copiar sus marcas reales. Respeta la relación de aspecto indicada en cada imagen.

IMAGEN 1 — archivo: public/images/products/panier-reveillon.jpg
Formato 4:5 (1200×1500 px). Panier noir tressé avec grand ruban émeraude et or, rempli de grande boîte de chocolats fins rouge, boîte de biscuits au beurre dorée, pot de caramel, bougie dorée, chocolat chaud en boîte et branches de sapin avec baies rouges. Produits de marques fictives sans texte lisible.

IMAGEN 2 — archivo: public/images/products/panier-douceurs-noel.jpg
Formato 4:5 (1200×1500 px). Panier en osier clair garni de boîtes de chocolats, biscuits décorés de Noël, guimauves et bonbons; ruban rouge bordeaux et or; petit sapin décoratif.

IMAGEN 3 — archivo: public/images/products/panier-cafe-the.jpg
Formato 4:5 (1200×1500 px). Panier noir tressé avec sachets de café, boîte de thés assortis, deux tasses en céramique crème, biscuits sablés et une bougie; ruban vert émeraude.

IMAGEN 4 — archivo: public/images/products/panier-chaleureux.jpg
Formato 4:5 (1200×1500 px). Panier avec bougie parfumée dorée, chocolat chaud, guimauves, biscuits, thermos noir mat et un petit coussin chauffant crème; ruban émeraude, ambiance feutrée.

IMAGEN 5 — archivo: public/images/products/panier-petit-cadeau.jpg
Formato 4:5 (1200×1500 px). Petit panier compact avec une boîte de chocolats, un sachet de biscuits, une petite bougie et un ruban émeraude; composition simple et élégante.

IMAGEN 6 — archivo: public/images/products/panier-prestige.jpg
Formato 4:5 (1200×1500 px). Grand panier luxueux noir tressé, très garni: coffret de chocolats, grande boîte de biscuits dorée, noix confites, thé et café fins, deux bougies dorées, thermos noir, décorations dorées, grand ruban émeraude.

IMAGEN 7 — archivo: public/images/bases/base-small.jpg
Formato 1:1 (1200×1200 px). Petit panier noir tressé vide avec paille dorée, vu de trois quarts, sur fond champagne neutre.

Empieza generando solo la IMAGEN 1 y espera mi "siguiente".
```

LOTE 3 DE 6

```
Vas a generar 7 imágenes para el sitio web de ED LUX GIFTS, una boutique de canastas de regalo en Pointe-Claire (Québec). Te voy a dar las 7 descripciones de una vez, pero quiero que las generes de UNA EN UNA: genera solo la primera ahora y espera. Cuando yo escriba "siguiente", genera la imagen 2, y así sucesivamente hasta terminar las 7. No generes más de una imagen por turno.

Estilo visual que deben compartir las 7 (aplícalo a todas): Fotografía de producto y de estilo de vida premium para una boutique elegante de canastas de regalo (Pointe-Claire, Québec), tomada con cámara real, no ilustración ni render 3D. Luz cálida dorada y suave, sombras delicadas, profundidad de campo moderada. Paleta permanente: verde esmeralda profundo (#06271E / #031B14), dorado (#D4A64D) y champán/marfil (#F2E6D4 / #FAF5EC); el rojo borgoña (#8A1730) solo como acento navideño puntual. Materiales realistas y refinados: mimbre trenzado negro o miel, satén esmeralda con borde dorado, vidrio facetado dorado, cartón rígido, cacao, galletas, velas. Para los productos del catálogo, usa siempre el mismo ángulo de cámara (vista de tres cuartos, ligeramente elevada, sujeto centrado) y composición limpia con mucho aire. Las imágenes de héroe y de tarjetas deben dejar un espacio negativo claro y despejado para superponer texto HTML. Todas las marcas, etiquetas y envases son ficticios, sin texto legible, sin logotipos reales y sin marcas comerciales. Nunca incluyas botellas de alcohol; usa únicamente alternativas sin alcohol. Sin texto, sin botones, sin elementos de interfaz web, sin marcas de agua, sin manos ni personas. Si adjuntas la maqueta aprobada del sitio, úsala solo como referencia de ambiente y estilo, sin copiar sus marcas reales. Respeta la relación de aspecto indicada en cada imagen.

IMAGEN 1 — archivo: public/images/bases/base-medium.jpg
Formato 1:1 (1200×1200 px). Panier noir tressé de taille moyenne, vide, avec paille dorée, vu de trois quarts, sur fond champagne neutre.

IMAGEN 2 — archivo: public/images/bases/base-large.jpg
Formato 1:1 (1200×1200 px). Grand panier noir tressé avec anses, vide, avec paille dorée, vu de trois quarts, sur fond champagne neutre.

IMAGEN 3 — archivo: public/images/items/chocolats-assortis.jpg
Formato 1:1 (900×900 px). Boîte de chocolats fins ouverte, assortiment de bonbons au chocolat, emballage rouge et or sans texte lisible.

IMAGEN 4 — archivo: public/images/items/truffes-noires.jpg
Formato 1:1 (900×900 px). Petit coffret doré de truffes au chocolat noir saupoudrées de cacao.

IMAGEN 5 — archivo: public/images/items/bonbons-noel.jpg
Formato 1:1 (900×900 px). Pot en verre rempli de bonbons rouges et blancs de Noël avec ruban émeraude.

IMAGEN 6 — archivo: public/images/items/biscuits-beurre.jpg
Formato 1:1 (900×900 px). Boîte ronde dorée de biscuits au beurre, couvercle ouvert montrant des biscuits.

IMAGEN 7 — archivo: public/images/items/biscuits-decores.jpg
Formato 1:1 (900×900 px). Sachet cellophane de biscuits de Noël décorés au glaçage blanc, ruban vert.

Empieza generando solo la IMAGEN 1 y espera mi "siguiente".
```

LOTE 4 DE 6

```
Vas a generar 7 imágenes para el sitio web de ED LUX GIFTS, una boutique de canastas de regalo en Pointe-Claire (Québec). Te voy a dar las 7 descripciones de una vez, pero quiero que las generes de UNA EN UNA: genera solo la primera ahora y espera. Cuando yo escriba "siguiente", genera la imagen 2, y así sucesivamente hasta terminar las 7. No generes más de una imagen por turno.

Estilo visual que deben compartir las 7 (aplícalo a todas): Fotografía de producto y de estilo de vida premium para una boutique elegante de canastas de regalo (Pointe-Claire, Québec), tomada con cámara real, no ilustración ni render 3D. Luz cálida dorada y suave, sombras delicadas, profundidad de campo moderada. Paleta permanente: verde esmeralda profundo (#06271E / #031B14), dorado (#D4A64D) y champán/marfil (#F2E6D4 / #FAF5EC); el rojo borgoña (#8A1730) solo como acento navideño puntual. Materiales realistas y refinados: mimbre trenzado negro o miel, satén esmeralda con borde dorado, vidrio facetado dorado, cartón rígido, cacao, galletas, velas. Para los productos del catálogo, usa siempre el mismo ángulo de cámara (vista de tres cuartos, ligeramente elevada, sujeto centrado) y composición limpia con mucho aire. Las imágenes de héroe y de tarjetas deben dejar un espacio negativo claro y despejado para superponer texto HTML. Todas las marcas, etiquetas y envases son ficticios, sin texto legible, sin logotipos reales y sin marcas comerciales. Nunca incluyas botellas de alcohol; usa únicamente alternativas sin alcohol. Sin texto, sin botones, sin elementos de interfaz web, sin marcas de agua, sin manos ni personas. Si adjuntas la maqueta aprobada del sitio, úsala solo como referencia de ambiente y estilo, sin copiar sus marcas reales. Respeta la relación de aspecto indicada en cada imagen.

IMAGEN 1 — archivo: public/images/items/caramel-popcorn.jpg
Formato 1:1 (900×900 px). Pot en verre de maïs soufflé au caramel avec couvercle doré et étiquette sans texte lisible.

IMAGEN 2 — archivo: public/images/items/cafe-moulu.jpg
Formato 1:1 (900×900 px). Sac de café noir mat avec étiquette dorée sans texte lisible, quelques grains au pied.

IMAGEN 3 — archivo: public/images/items/the-assortis.jpg
Formato 1:1 (900×900 px). Boîte de thés assortis en sachets, ouverte, avec une tasse crème.

IMAGEN 4 — archivo: public/images/items/chocolat-chaud.jpg
Formato 1:1 (900×900 px). Pot en verre de mélange à chocolat chaud avec guimauves, ruban doré.

IMAGEN 5 — archivo: public/images/items/cidre-pomme.jpg
Formato 1:1 (900×900 px). Bouteille élégante de cidre de pomme pétillant sans alcool avec étiquette fictive sans texte lisible et capsule dorée.

IMAGEN 6 — archivo: public/images/items/jus-raisin.jpg
Formato 1:1 (900×900 px). Bouteille de jus de raisin pétillant sans alcool avec étiquette fictive sans texte lisible, bouchon doré.

IMAGEN 7 — archivo: public/images/items/bougie-doree.jpg
Formato 1:1 (900×900 px). Bougie parfumée dans un contenant en verre doré facetté, flamme allumée.

Empieza generando solo la IMAGEN 1 y espera mi "siguiente".
```

LOTE 5 DE 6

```
Vas a generar 7 imágenes para el sitio web de ED LUX GIFTS, una boutique de canastas de regalo en Pointe-Claire (Québec). Te voy a dar las 7 descripciones de una vez, pero quiero que las generes de UNA EN UNA: genera solo la primera ahora y espera. Cuando yo escriba "siguiente", genera la imagen 2, y así sucesivamente hasta terminar las 7. No generes más de una imagen por turno.

Estilo visual que deben compartir las 7 (aplícalo a todas): Fotografía de producto y de estilo de vida premium para una boutique elegante de canastas de regalo (Pointe-Claire, Québec), tomada con cámara real, no ilustración ni render 3D. Luz cálida dorada y suave, sombras delicadas, profundidad de campo moderada. Paleta permanente: verde esmeralda profundo (#06271E / #031B14), dorado (#D4A64D) y champán/marfil (#F2E6D4 / #FAF5EC); el rojo borgoña (#8A1730) solo como acento navideño puntual. Materiales realistas y refinados: mimbre trenzado negro o miel, satén esmeralda con borde dorado, vidrio facetado dorado, cartón rígido, cacao, galletas, velas. Para los productos del catálogo, usa siempre el mismo ángulo de cámara (vista de tres cuartos, ligeramente elevada, sujeto centrado) y composición limpia con mucho aire. Las imágenes de héroe y de tarjetas deben dejar un espacio negativo claro y despejado para superponer texto HTML. Todas las marcas, etiquetas y envases son ficticios, sin texto legible, sin logotipos reales y sin marcas comerciales. Nunca incluyas botellas de alcohol; usa únicamente alternativas sin alcohol. Sin texto, sin botones, sin elementos de interfaz web, sin marcas de agua, sin manos ni personas. Si adjuntas la maqueta aprobada del sitio, úsala solo como referencia de ambiente y estilo, sin copiar sus marcas reales. Respeta la relación de aspecto indicada en cada imagen.

IMAGEN 1 — archivo: public/images/items/bougie-sapin.jpg
Formato 1:1 (900×900 px). Bougie verte en verre sombre avec couvercle doré, parfum de sapin, quelques branches de sapin à côté.

IMAGEN 2 — archivo: public/images/items/thermos-noir.jpg
Formato 1:1 (900×900 px). Thermos isotherme noir mat avec monogramme doré discret, couvercle fermé.

IMAGEN 3 — archivo: public/images/items/coussin-chauffant.jpg
Formato 1:1 (900×900 px). Petit coussin chauffant en tissu crème doux, plié, avec ruban émeraude.

IMAGEN 4 — archivo: public/images/items/boule-doree.jpg
Formato 1:1 (900×900 px). Trois boules de Noël dorées avec ruban, sur fond champagne.

IMAGEN 5 — archivo: public/images/items/ornement-sapin.jpg
Formato 1:1 (900×900 px). Ornement de sapin en verre émeraude et or, suspendu à un ruban.

IMAGEN 6 — archivo: public/images/items/noix-confites.jpg
Formato 1:1 (900×900 px). Pot en verre de noix confites caramélisées avec couvercle doré.

IMAGEN 7 — archivo: public/images/options/option-wrap.jpg
Formato 1:1 (900×900 px). Panier enveloppé de cellophane transparente nouée par un ruban doré, vu de face.

Empieza generando solo la IMAGEN 1 y espera mi "siguiente".
```

LOTE 6 DE 6

```
Vas a generar 3 imágenes para el sitio web de ED LUX GIFTS, una boutique de canastas de regalo en Pointe-Claire (Québec). Te voy a dar las 3 descripciones de una vez, pero quiero que las generes de UNA EN UNA: genera solo la primera ahora y espera. Cuando yo escriba "siguiente", genera la imagen 2, y así sucesivamente hasta terminar las 3. No generes más de una imagen por turno.

Estilo visual que deben compartir las 3 (aplícalo a todas): Fotografía de producto y de estilo de vida premium para una boutique elegante de canastas de regalo (Pointe-Claire, Québec), tomada con cámara real, no ilustración ni render 3D. Luz cálida dorada y suave, sombras delicadas, profundidad de campo moderada. Paleta permanente: verde esmeralda profundo (#06271E / #031B14), dorado (#D4A64D) y champán/marfil (#F2E6D4 / #FAF5EC); el rojo borgoña (#8A1730) solo como acento navideño puntual. Materiales realistas y refinados: mimbre trenzado negro o miel, satén esmeralda con borde dorado, vidrio facetado dorado, cartón rígido, cacao, galletas, velas. Para los productos del catálogo, usa siempre el mismo ángulo de cámara (vista de tres cuartos, ligeramente elevada, sujeto centrado) y composición limpia con mucho aire. Las imágenes de héroe y de tarjetas deben dejar un espacio negativo claro y despejado para superponer texto HTML. Todas las marcas, etiquetas y envases son ficticios, sin texto legible, sin logotipos reales y sin marcas comerciales. Nunca incluyas botellas de alcohol; usa únicamente alternativas sin alcohol. Sin texto, sin botones, sin elementos de interfaz web, sin marcas de agua, sin manos ni personas. Si adjuntas la maqueta aprobada del sitio, úsala solo como referencia de ambiente y estilo, sin copiar sus marcas reales. Respeta la relación de aspecto indicada en cada imagen.

IMAGEN 1 — archivo: public/images/options/option-ribbon.jpg
Formato 1:1 (900×900 px). Grand nœud de satin vert émeraude à bordure dorée posé sur un fond champagne.

IMAGEN 2 — archivo: public/images/options/option-decor.jpg
Formato 1:1 (900×900 px). Petite composition de branches de sapin, baies rouges et pomme de pin dorée.

IMAGEN 3 — archivo: public/images/options/option-card.jpg
Formato 1:1 (900×900 px). Carte de vœux ivoire avec bordure dorée, vierge, appuyée contre une branche de sapin.

Empieza generando solo la IMAGEN 1 y espera mi "siguiente".
```
