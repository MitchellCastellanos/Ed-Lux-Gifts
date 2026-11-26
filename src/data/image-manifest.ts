/** Single source of truth for every generated image: used by the seed, the placeholder generator and docs/IMAGE_ASSETS.md. */
export type ImageAsset = {
  file: string; // public path
  w: number;
  h: number;
  group: 'hero' | 'card' | 'collection' | 'product' | 'base' | 'item' | 'option';
  placement: string;
  purpose: string;
  label: string; // short label shown on the temporary placeholder
  prompt: string; // Spanish prompt body (image-prompts skill format)
  refs?: string;
};

const P = (name: string) => `public/images/${name}`;

export const IMAGES: ImageAsset[] = [
  { file: P('hero/hero-christmas-desktop.jpg'), w: 2400, h: 1000, group: 'hero', placement: 'Homepage hero, desktop (≥768px)', purpose: 'Christmas campaign banner', label: 'Hero Noël — bureau',
    refs: 'Maqueta aprobada (hero) + fotos reales del negocio',
    prompt: 'Panorámica 12:5. Un elegante panier-cadeau noir tressé, orné d’un grand ruban de satin vert émeraude à bordure dorée, rempli de boîtes de chocolats, de biscuits au beurre dans une boîte ronde dorée, d’un pot de caramel, d’un thermos noir mat, d’une bougie dorée en verre facetté et de branches de sapin avec baies rouges. Aucune bouteille d’alcool. Le panier occupe le tiers droit de l’image, sur une table en bois sombre; fond de lumières bokeh dorées et de sapin. Le côté gauche, environ 45 % de l’image, reste un fond vert émeraude profond, doux et dégagé pour superposer du texte.' },
  { file: P('hero/hero-christmas-mobile.jpg'), w: 1080, h: 1350, group: 'hero', placement: 'Homepage hero, mobile', purpose: 'Christmas campaign banner (portrait crop)', label: 'Hero Noël — mobile',
    refs: 'hero-christmas-desktop.jpg',
    prompt: 'Format portrait 4:5. Même panier-cadeau de Noël que la bannière horizontale, cadré dans la moitié inférieure de l’image, sur une table en bois sombre avec lumières bokeh dorées au fond. La moitié supérieure reste un fond vert émeraude profond et dégagé, avec seulement quelques branches de sapin discrètes sur les bords, pour superposer du texte.' },
  { file: P('hero/hero-evergreen-desktop.jpg'), w: 2400, h: 1000, group: 'hero', placement: 'Homepage hero when no campaign is active', purpose: 'Neutral evergreen fallback hero', label: 'Hero neutre — bureau',
    prompt: 'Panorámica 12:5. Panier-cadeau tressé élégant sans décor saisonnier, ruban de satin vert émeraude, chocolats, biscuits, bougie dorée et thé en boîte, sur une table en bois sombre. Lumière chaude dorée, fond émeraude très sombre légèrement flou. Le panier occupe le tiers droit; le côté gauche reste un fond émeraude dégagé pour du texte.' },
  { file: P('hero/hero-evergreen-mobile.jpg'), w: 1080, h: 1350, group: 'hero', placement: 'Homepage hero when no campaign is active, mobile', purpose: 'Neutral evergreen fallback hero (portrait)', label: 'Hero neutre — mobile',
    refs: 'hero-evergreen-desktop.jpg',
    prompt: 'Format portrait 4:5. Le même panier-cadeau neutre, cadré dans la moitié inférieure, fond émeraude sombre flou; la moitié supérieure reste dégagée pour du texte.' },
  { file: P('cards/path-ready-made.jpg'), w: 1200, h: 900, group: 'card', placement: 'Homepage shopping path A (Paniers prédéfinis)', purpose: 'Ready-made baskets card photo', label: 'Paniers prédéfinis',
    prompt: 'Format 4:3. Panier-cadeau noir tressé garni de chocolats, biscuits et bougie, ruban vert émeraude et or, branches de sapin et boules dorées autour, fond bokeh doré chaleureux. Sujet à gauche-centre, espace libre à droite.' },
  { file: P('cards/path-custom.jpg'), w: 1200, h: 900, group: 'card', placement: 'Homepage shopping path B (Créez votre propre panier)', purpose: 'Build-your-own card photo', label: 'Créez votre panier',
    prompt: 'Format 4:3. Panier en osier doré vide, garni de paille dorée, à côté d’une bobine de ruban rouge et or, d’une pomme de pin et de branches de sapin; fond bokeh doré chaleureux. Sujet à gauche-centre, espace libre à droite.' },
  { file: P('collections/collection-christmas.jpg'), w: 1600, h: 900, group: 'collection', placement: 'Collection cover', purpose: 'Christmas collection cover', label: 'Collection Noël',
    prompt: 'Format 16:9. Composition de Noël : plusieurs paniers-cadeaux élégants alignés sur une table en bois sombre devant des lumières bokeh dorées et des branches de sapin; rubans émeraude et or.' },

  { file: P('products/panier-reveillon.jpg'), w: 1200, h: 1500, group: 'product', placement: 'Catalog / product page', purpose: 'Premium curated basket', label: 'Panier Réveillon',
    prompt: 'Panier noir tressé avec grand ruban émeraude et or, rempli de grande boîte de chocolats fins rouge, boîte de biscuits au beurre dorée, pot de caramel, bougie dorée, chocolat chaud en boîte et branches de sapin avec baies rouges. Produits de marques fictives sans texte lisible.' },
  { file: P('products/panier-douceurs-noel.jpg'), w: 1200, h: 1500, group: 'product', placement: 'Catalog / product page', purpose: 'Sweet-treats curated basket', label: 'Douceurs de Noël',
    prompt: 'Panier en osier clair garni de boîtes de chocolats, biscuits décorés de Noël, guimauves et bonbons; ruban rouge bordeaux et or; petit sapin décoratif.' },
  { file: P('products/panier-cafe-the.jpg'), w: 1200, h: 1500, group: 'product', placement: 'Catalog / product page', purpose: 'Coffee & tea curated basket', label: 'Café et thé',
    prompt: 'Panier noir tressé avec sachets de café, boîte de thés assortis, deux tasses en céramique crème, biscuits sablés et une bougie; ruban vert émeraude.' },
  { file: P('products/panier-chaleureux.jpg'), w: 1200, h: 1500, group: 'product', placement: 'Catalog / product page', purpose: 'Cozy evening curated basket', label: 'Soirée chaleureuse',
    prompt: 'Panier avec bougie parfumée dorée, chocolat chaud, guimauves, biscuits, thermos noir mat et un petit coussin chauffant crème; ruban émeraude, ambiance feutrée.' },
  { file: P('products/panier-petit-cadeau.jpg'), w: 1200, h: 1500, group: 'product', placement: 'Catalog / product page', purpose: 'Small gift curated basket', label: 'Petit cadeau',
    prompt: 'Petit panier compact avec une boîte de chocolats, un sachet de biscuits, une petite bougie et un ruban émeraude; composition simple et élégante.' },
  { file: P('products/panier-prestige.jpg'), w: 1200, h: 1500, group: 'product', placement: 'Catalog / product page', purpose: 'Large prestige curated basket', label: 'Prestige',
    prompt: 'Grand panier luxueux noir tressé, très garni: coffret de chocolats, grande boîte de biscuits dorée, noix confites, thé et café fins, deux bougies dorées, thermos noir, décorations dorées, grand ruban émeraude.' },

  { file: P('bases/base-small.jpg'), w: 1200, h: 1200, group: 'base', placement: 'Builder step 1', purpose: 'Small basket base', label: 'Petit panier', prompt: 'Petit panier noir tressé vide avec paille dorée, vu de trois quarts, sur fond champagne neutre.' },
  { file: P('bases/base-medium.jpg'), w: 1200, h: 1200, group: 'base', placement: 'Builder step 1', purpose: 'Medium basket base', label: 'Panier moyen', prompt: 'Panier noir tressé de taille moyenne, vide, avec paille dorée, vu de trois quarts, sur fond champagne neutre.' },
  { file: P('bases/base-large.jpg'), w: 1200, h: 1200, group: 'base', placement: 'Builder step 1', purpose: 'Large basket base', label: 'Grand panier', prompt: 'Grand panier noir tressé avec anses, vide, avec paille dorée, vu de trois quarts, sur fond champagne neutre.' },

  { file: P('items/chocolats-assortis.jpg'), w: 900, h: 900, group: 'item', placement: 'Builder / inventory', purpose: 'Assorted chocolates box', label: 'Chocolats assortis', prompt: 'Boîte de chocolats fins ouverte, assortiment de bonbons au chocolat, emballage rouge et or sans texte lisible.' },
  { file: P('items/truffes-noires.jpg'), w: 900, h: 900, group: 'item', placement: 'Builder / inventory', purpose: 'Dark chocolate truffles', label: 'Truffes noires', prompt: 'Petit coffret doré de truffes au chocolat noir saupoudrées de cacao.' },
  { file: P('items/bonbons-noel.jpg'), w: 900, h: 900, group: 'item', placement: 'Builder / inventory', purpose: 'Christmas candy', label: 'Bonbons de Noël', prompt: 'Pot en verre rempli de bonbons rouges et blancs de Noël avec ruban émeraude.' },
  { file: P('items/biscuits-beurre.jpg'), w: 900, h: 900, group: 'item', placement: 'Builder / inventory', purpose: 'Butter cookies tin', label: 'Biscuits au beurre', prompt: 'Boîte ronde dorée de biscuits au beurre, couvercle ouvert montrant des biscuits.' },
  { file: P('items/biscuits-decores.jpg'), w: 900, h: 900, group: 'item', placement: 'Builder / inventory', purpose: 'Decorated cookies', label: 'Biscuits décorés', prompt: 'Sachet cellophane de biscuits de Noël décorés au glaçage blanc, ruban vert.' },
  { file: P('items/caramel-popcorn.jpg'), w: 900, h: 900, group: 'item', placement: 'Builder / inventory', purpose: 'Caramel popcorn', label: 'Maïs soufflé caramel', prompt: 'Pot en verre de maïs soufflé au caramel avec couvercle doré et étiquette sans texte lisible.' },
  { file: P('items/cafe-moulu.jpg'), w: 900, h: 900, group: 'item', placement: 'Builder / inventory', purpose: 'Ground coffee', label: 'Café moulu', prompt: 'Sac de café noir mat avec étiquette dorée sans texte lisible, quelques grains au pied.' },
  { file: P('items/the-assortis.jpg'), w: 900, h: 900, group: 'item', placement: 'Builder / inventory', purpose: 'Tea assortment', label: 'Thés assortis', prompt: 'Boîte de thés assortis en sachets, ouverte, avec une tasse crème.' },
  { file: P('items/chocolat-chaud.jpg'), w: 900, h: 900, group: 'item', placement: 'Builder / inventory', purpose: 'Hot chocolate mix', label: 'Chocolat chaud', prompt: 'Pot en verre de mélange à chocolat chaud avec guimauves, ruban doré.' },
  { file: P('items/cidre-pomme.jpg'), w: 900, h: 900, group: 'item', placement: 'Builder / inventory', purpose: 'Sparkling apple cider (non-alcoholic)', label: 'Cidre de pomme pétillant', prompt: 'Bouteille élégante de cidre de pomme pétillant sans alcool avec étiquette fictive sans texte lisible et capsule dorée.' },
  { file: P('items/jus-raisin.jpg'), w: 900, h: 900, group: 'item', placement: 'Builder / inventory', purpose: 'Sparkling grape juice (non-alcoholic)', label: 'Jus de raisin pétillant', prompt: 'Bouteille de jus de raisin pétillant sans alcool avec étiquette fictive sans texte lisible, bouchon doré.' },
  { file: P('items/bougie-doree.jpg'), w: 900, h: 900, group: 'item', placement: 'Builder / inventory', purpose: 'Gold candle', label: 'Bougie dorée', prompt: 'Bougie parfumée dans un contenant en verre doré facetté, flamme allumée.' },
  { file: P('items/bougie-sapin.jpg'), w: 900, h: 900, group: 'item', placement: 'Builder / inventory', purpose: 'Pine candle', label: 'Bougie sapin', prompt: 'Bougie verte en verre sombre avec couvercle doré, parfum de sapin, quelques branches de sapin à côté.' },
  { file: P('items/thermos-noir.jpg'), w: 900, h: 900, group: 'item', placement: 'Builder / inventory', purpose: 'Black insulated tumbler', label: 'Thermos noir', prompt: 'Thermos isotherme noir mat avec monogramme doré discret, couvercle fermé.' },
  { file: P('items/coussin-chauffant.jpg'), w: 900, h: 900, group: 'item', placement: 'Builder / inventory', purpose: 'Heating pad plush', label: 'Coussin chauffant', prompt: 'Petit coussin chauffant en tissu crème doux, plié, avec ruban émeraude.' },
  { file: P('items/boule-doree.jpg'), w: 900, h: 900, group: 'item', placement: 'Builder / inventory', purpose: 'Gold ornaments', label: 'Boules dorées', prompt: 'Trois boules de Noël dorées avec ruban, sur fond champagne.' },
  { file: P('items/ornement-sapin.jpg'), w: 900, h: 900, group: 'item', placement: 'Builder / inventory', purpose: 'Tree ornament', label: 'Ornement de sapin', prompt: 'Ornement de sapin en verre émeraude et or, suspendu à un ruban.' },
  { file: P('items/noix-confites.jpg'), w: 900, h: 900, group: 'item', placement: 'Builder / inventory', purpose: 'Candied nuts', label: 'Noix confites', prompt: 'Pot en verre de noix confites caramélisées avec couvercle doré.' },

  { file: P('options/option-wrap.jpg'), w: 900, h: 900, group: 'option', placement: 'Builder step 3', purpose: 'Gift wrapping', label: 'Emballage cadeau', prompt: 'Panier enveloppé de cellophane transparente nouée par un ruban doré, vu de face.' },
  { file: P('options/option-ribbon.jpg'), w: 900, h: 900, group: 'option', placement: 'Builder step 3', purpose: 'Premium ribbon', label: 'Ruban de satin', prompt: 'Grand nœud de satin vert émeraude à bordure dorée posé sur un fond champagne.' },
  { file: P('options/option-decor.jpg'), w: 900, h: 900, group: 'option', placement: 'Builder step 3', purpose: 'Decorative elements', label: 'Éléments décoratifs', prompt: 'Petite composition de branches de sapin, baies rouges et pomme de pin dorée.' },
  { file: P('options/option-card.jpg'), w: 900, h: 900, group: 'option', placement: 'Builder step 3', purpose: 'Greeting card', label: 'Carte de vœux', prompt: 'Carte de vœux ivoire avec bordure dorée, vierge, appuyée contre une branche de sapin.' },
];

export const IMG = (suffix: string) => {
  const f = IMAGES.find((i) => i.file.endsWith(suffix));
  if (!f) throw new Error('unknown image ' + suffix);
  return f.file.replace(/^public/, '');
};
