/* Demo seed: Christmas-only fictional data. Safe to re-run: it refuses to run on a database that already has products unless --force. */
import { PrismaClient } from '@prisma/client';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { IMG } from '../src/data/image-manifest';
import { createOrder, applyAction, expireReservations } from '../src/lib/orders';
import { saveSetting, defaults } from '../src/lib/settings';
import { zonedParts, ymd, dayOfWeek } from '../src/lib/schedule';

const prisma = new PrismaClient();

async function ensureAdmin() {
  const email = process.env.ADMIN_EMAIL ?? 'owner@example.com';
  let password = process.env.ADMIN_PASSWORD;
  if (!password) {
    if (process.env.NODE_ENV === 'production') throw new Error('ADMIN_PASSWORD is required in production');
    password = 'demo-owner-pass-2026';
  }
  if (await prisma.user.findUnique({ where: { email } })) return console.log('admin exists:', email);
  const a = betterAuth({ database: prismaAdapter(prisma, { provider: 'postgresql' }), secret: process.env.BETTER_AUTH_SECRET, emailAndPassword: { enabled: true } });
  const ctx = await a.$context;
  const hash = await ctx.password.hash(password);
  const user = await (ctx.internalAdapter as any).createUser({ email, name: "Owner", emailVerified: true });
  await ctx.internalAdapter.linkAccount({ userId: user.id, providerId: 'credential', accountId: user.id, password: hash });
  console.log(`admin created: ${email}${process.env.ADMIN_PASSWORD ? '' : ' (dev password printed in README)'}`);
}

async function main() {
  await ensureAdmin();
  if (process.env.SEED_ADMIN_ONLY === '1') return console.log('admin-only seed (no demo data)');
  if ((await prisma.product.count()) > 0 && !process.argv.includes('--force')) return console.log('catalog already seeded; use --force to skip this check');

  for (const k of Object.keys(defaults) as (keyof typeof defaults)[]) await saveSetting(k, defaults[k] as any);

  // categories
  const catDefs = [
    ['chocolats-sucreries', 'Chocolats et sucreries', 'Chocolates and sweets'],
    ['biscuits-collations', 'Biscuits et collations', 'Cookies and snacks'],
    ['cafe-the', 'Café et thé', 'Coffee and tea'],
    ['boissons', 'Boissons sans alcool', 'Non-alcoholic beverages'],
    ['bougies', 'Bougies', 'Candles'],
    ['cadeaux', 'Cadeaux et accessoires', 'Gifts and accessories'],
    ['decorations', 'Décorations de Noël', 'Christmas decorations'],
  ];
  const cat: Record<string, string> = {};
  for (const [i, [slug, fr, en]] of catDefs.entries()) cat[slug] = (await prisma.category.create({ data: { slug, nameFr: fr, nameEn: en, sortOrder: i, isDemo: true } })).id;

  // presentation options
  const opt: Record<string, string> = {};
  const optDefs: [string, string, string, number, string, string][] = [
    ['wrap', 'Emballage cadeau', 'Gift wrapping', 600, 'Cellophane transparente nouée avec un ruban.', 'Clear cellophane tied with a ribbon.'],
    ['ribbon', 'Ruban de satin', 'Satin ribbon', 400, 'Grand nœud de satin émeraude et or.', 'Large emerald and gold satin bow.'],
    ['decor', 'Éléments décoratifs', 'Decorative elements', 500, 'Branches de sapin, baies et pomme de pin.', 'Pine sprigs, berries and a pine cone.'],
    ['card', 'Carte de vœux', 'Greeting card', 400, 'Carte ivoire avec votre message manuscrit.', 'Ivory card with your handwritten message.'],
  ];
  for (const [i, [k, fr, en, price, dfr, den]] of optDefs.entries())
    opt[k] = (await prisma.component.create({ data: { kind: 'PRESENTATION', nameFr: fr, nameEn: en, descFr: dfr, descEn: den, priceCents: price, stockOnHand: 60, imageUrl: IMG(`options/option-${k}.jpg`), sortOrder: i, capacityCost: 0, isDemo: true } })).id;

  // bases (the small one includes ribbon; medium & large include ribbon + wrapping)
  const baseDefs: [string, string, string, number, number, string[], number][] = [
    ['small', 'Petit panier', 'Small basket', 2500, 8, [opt.ribbon], 20],
    ['medium', 'Panier moyen', 'Medium basket', 4000, 14, [opt.ribbon, opt.wrap], 20],
    ['large', 'Grand panier', 'Large basket', 6000, 22, [opt.ribbon, opt.wrap], 12],
  ];
  const base: Record<string, string> = {};
  for (const [i, [k, fr, en, price, cap, inc, stock]] of baseDefs.entries())
    base[k] = (await prisma.component.create({ data: { kind: 'BASE', nameFr: fr, nameEn: en, priceCents: price, capacity: cap, includedOptionIds: inc, stockOnHand: stock, imageUrl: IMG(`bases/base-${k}.jpg`), sortOrder: i, isDemo: true } })).id;

  // items: [key, cat, fr, en, price, stock, capCost]
  const itemDefs: [string, string, string, string, number, number, number][] = [
    ['chocolats-assortis', 'chocolats-sucreries', 'Chocolats assortis', 'Assorted chocolates', 1800, 30, 2],
    ['truffes-noires', 'chocolats-sucreries', 'Truffes au chocolat noir', 'Dark chocolate truffles', 1500, 24, 1],
    ['bonbons-noel', 'chocolats-sucreries', 'Bonbons de Noël', 'Christmas candy', 900, 30, 1],
    ['biscuits-beurre', 'biscuits-collations', 'Biscuits au beurre (boîte)', 'Butter cookies (tin)', 1600, 28, 2],
    ['biscuits-decores', 'biscuits-collations', 'Biscuits de Noël décorés', 'Decorated Christmas cookies', 1200, 25, 1],
    ['caramel-popcorn', 'biscuits-collations', 'Maïs soufflé au caramel', 'Caramel popcorn', 1100, 20, 1],
    ['noix-confites', 'biscuits-collations', 'Noix confites', 'Candied nuts', 1300, 18, 1],
    ['cafe-moulu', 'cafe-the', 'Café moulu', 'Ground coffee', 1400, 22, 1],
    ['the-assortis', 'cafe-the', 'Thés assortis', 'Assorted teas', 1300, 22, 1],
    ['chocolat-chaud', 'cafe-the', 'Chocolat chaud et guimauves', 'Hot chocolate and marshmallows', 1200, 26, 1],
    ['cidre-pomme', 'boissons', 'Cidre de pomme pétillant (sans alcool)', 'Sparkling apple cider (non-alcoholic)', 1600, 16, 2],
    ['jus-raisin', 'boissons', 'Jus de raisin pétillant (sans alcool)', 'Sparkling grape juice (non-alcoholic)', 1800, 14, 2],
    ['bougie-doree', 'bougies', 'Bougie dorée', 'Gold candle', 2200, 18, 2],
    ['bougie-sapin', 'bougies', 'Bougie parfum sapin', 'Pine-scented candle', 1900, 18, 2],
    ['thermos-noir', 'cadeaux', 'Thermos noir mat', 'Matte black tumbler', 2800, 12, 3],
    ['coussin-chauffant', 'cadeaux', 'Coussin chauffant doux', 'Soft heating pad', 2400, 10, 3],
    ['boule-doree', 'decorations', 'Boules dorées (3)', 'Gold ornaments (3)', 800, 30, 1],
    ['ornement-sapin', 'decorations', 'Ornement de sapin émeraude', 'Emerald tree ornament', 1000, 24, 1],
  ];
  const item: Record<string, string> = {};
  for (const [i, [k, c, fr, en, price, stock, cost]] of itemDefs.entries())
    item[k] = (await prisma.component.create({ data: { kind: 'ITEM', categoryId: cat[c], nameFr: fr, nameEn: en, priceCents: price, stockOnHand: stock, capacityCost: cost, imageUrl: IMG(`items/${k}.jpg`), sortOrder: i, isDemo: true } })).id;
  await prisma.component.update({ where: { id: item['coussin-chauffant'] }, data: { stockOnHand: 4 } }); // shows a low-stock indicator

  // collection + campaign
  const col = await prisma.collection.create({ data: { slug: 'noel', nameFr: 'Notre collection de Noël', nameEn: 'Our Christmas collection', descFr: 'Des paniers-cadeaux de Noël élégants, prêts à offrir.', descEn: 'Elegant Christmas gift baskets, ready to give.', imageUrl: IMG('collections/collection-christmas.jpg'), isDemo: true } });
  await prisma.campaign.create({ data: { name: 'Noël (démo)', eyebrowFr: 'PANIERS-CADEAUX DE NOËL', eyebrowEn: 'CHRISTMAS GIFT BASKETS', headlineFr: 'Offrez la magie de *Noël*', headlineEn: 'Give the magic of *Christmas*', descFr: 'Des paniers-cadeaux élégants et soigneusement composés pour faire plaisir à vos proches.', descEn: 'Elegant, thoughtfully curated gift baskets to make your loved ones feel special.', ctaFr: 'Magasiner la collection de Noël', ctaEn: 'Shop the Christmas collection', taglineFr: 'DES CADEAUX QUI RASSEMBLENT À NOËL', taglineEn: 'GIFTS THAT BRING EVERYONE TOGETHER THIS CHRISTMAS', desktopImage: IMG('hero/hero-christmas-desktop.jpg'), mobileImage: IMG('hero/hero-christmas-mobile.jpg'), collectionId: col.id, accent: 'gold', published: true, isDemo: true } });

  // ready-made baskets: [slug, fr, en, descFr, descEn, price, featured, recipe]
  type R = [string, number][];
  const prods: [string, string, string, string, string, number, boolean, R][] = [
    ['reveillon', 'Panier Réveillon', 'Reveillon Basket', 'Notre panier signature : chocolats fins, biscuits au beurre, caramel, bougie dorée et cidre pétillant sans alcool.', 'Our signature basket: fine chocolates, butter cookies, caramel, a gold candle and sparkling non-alcoholic cider.', 12900, true, [['large', 1], ['chocolats-assortis', 1], ['biscuits-beurre', 1], ['caramel-popcorn', 1], ['bougie-doree', 1], ['cidre-pomme', 1], ['chocolat-chaud', 1], ['ornement-sapin', 1]]],
    ['douceurs', 'Douceurs de Noël', 'Christmas Sweets', 'Chocolats, truffes, biscuits décorés et bonbons dans un panier ruban rouge et or.', 'Chocolates, truffles, decorated cookies and candy in a red-and-gold ribbon basket.', 7900, true, [['medium', 1], ['chocolats-assortis', 1], ['truffes-noires', 1], ['biscuits-decores', 1], ['bonbons-noel', 1]]],
    ['cafe-the', 'Café et thé', 'Coffee & Tea', 'Café moulu, thés assortis, chocolat chaud et biscuits au beurre pour les amateurs de boissons chaudes.', 'Ground coffee, assorted teas, hot chocolate and butter cookies for hot-drink lovers.', 6900, true, [['medium', 1], ['cafe-moulu', 1], ['the-assortis', 1], ['chocolat-chaud', 1], ['biscuits-beurre', 1]]],
    ['chaleureux', 'Soirée chaleureuse', 'Cozy Evening', 'Bougie sapin, chocolat chaud, coussin chauffant et thermos pour une soirée tout en douceur.', 'Pine candle, hot chocolate, heating pad and tumbler for a soft, cozy evening.', 8900, true, [['medium', 1], ['bougie-sapin', 1], ['chocolat-chaud', 1], ['coussin-chauffant', 1], ['thermos-noir', 1]]],
    ['petit-cadeau', 'Petit cadeau', 'Little Gift', 'Une petite attention élégante : chocolats, biscuits et boule dorée.', 'A small elegant treat: chocolates, cookies and a gold ornament.', 4500, false, [['small', 1], ['truffes-noires', 1], ['biscuits-decores', 1], ['boule-doree', 1]]],
    ['prestige', 'Prestige', 'Prestige', 'Notre grand panier : chocolats, biscuits, noix confites, café, thé, deux bougies, thermos et jus pétillant.', 'Our grand basket: chocolates, cookies, candied nuts, coffee, tea, two candles, tumbler and sparkling juice.', 17900, false, [['large', 1], ['chocolats-assortis', 1], ['biscuits-beurre', 1], ['noix-confites', 1], ['cafe-moulu', 1], ['the-assortis', 1], ['bougie-doree', 1], ['bougie-sapin', 1], ['thermos-noir', 1], ['jus-raisin', 1]]],
  ];
  const prodIds: Record<string, string> = {};
  for (const [i, [slug, fr, en, dfr, den, price, featured, recipe]] of prods.entries()) {
    const p = await prisma.product.create({ data: { slug, nameFr: fr, nameEn: en, descFr: dfr, descEn: den, priceCents: price, featured, sortOrder: i, isDemo: true,
      images: { create: [{ url: IMG(`products/panier-${slug === 'cafe-the' ? 'cafe-the' : slug === 'douceurs' ? 'douceurs-noel' : slug === 'reveillon' ? 'reveillon' : slug === 'chaleureux' ? 'chaleureux' : slug === 'petit-cadeau' ? 'petit-cadeau' : 'prestige'}.jpg`), altFr: fr, altEn: en }] },
      recipe: { create: recipe.map(([k, q]) => ({ componentId: base[k] ?? item[k], quantity: q })) },
      collections: { create: [{ collectionId: col.id }] } } });
    prodIds[slug] = p.id;
  }
  // presentation options included in ready-made baskets also consume stock
  for (const slug of ['reveillon', 'prestige', 'douceurs', 'cafe-the', 'chaleureux'])
    for (const o of ['ribbon', 'wrap']) await prisma.productComponent.create({ data: { productId: prodIds[slug], componentId: opt[o], quantity: 1 } });
  await prisma.productComponent.create({ data: { productId: prodIds['petit-cadeau'], componentId: opt.ribbon, quantity: 1 } });

  // delivery zones (illustrative)
  const zones: [string, string, number, number | null, string[], string][] = [
    ['Zone A — Locale', 'Pointe-Claire, Kirkland, Beaconsfield, Dorval', 500, 15000, ['H9R', 'H9S', 'H9H', 'H9J', 'H9W', 'H9P'], 'A'],
    ['Zone B — Étendue', 'Dollard-des-Ormeaux, Lachine, Sainte-Anne-de-Bellevue', 1000, null, ['H9A', 'H9B', 'H9G', 'H8S', 'H8T', 'H9X'], 'B'],
    ['Zone C — Sud-Ouest', 'LaSalle, Verdun, Le Sud-Ouest', 1500, null, ['H8N', 'H8P', 'H4G', 'H4H', 'H3J', 'H4C', 'H4E'], 'C'],
  ];
  for (const [i, [name, areas, fee, free, prefixes]] of zones.entries())
    await prisma.deliveryZone.create({ data: { name, areas, feeCents: fee, freeThresholdCents: free, sortOrder: i, verified: false, prefixes: { create: prefixes.map((prefix) => ({ prefix })) } } });

  await seedOrders(prodIds, base, item, opt);
  console.log('Seed complete.');
}

function weekendDates(offsetWeeks: number): [string, string] {
  const p = zonedParts(new Date());
  const today = new Date(Date.UTC(p.y, p.m - 1, p.d));
  const toSat = (6 - today.getUTCDay() + 7) % 7;
  const sat = new Date(today.getTime() + (toSat + offsetWeeks * 7) * 86400000);
  const sun = new Date(sat.getTime() + 86400000);
  const f = (d: Date) => ymd(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  return [f(sat), f(sun)];
}

async function seedOrders(prodIds: Record<string, string>, base: Record<string, string>, item: Record<string, string>, opt: Record<string, string>) {
  const zone = await prisma.deliveryZone.findFirstOrThrow({ orderBy: { sortOrder: 'asc' } });
  void zone;
  let n = 0;
  const place = async (o: { phone: string; name: string; email: string; locale?: 'fr' | 'en'; cart: any[]; date: string; pay: 'INTERAC' | 'COD_CASH'; postal: string; city?: string; daysBefore: number; recipient?: string; then?: ('confirm' | 'markPaid' | 'prepare' | 'ready' | 'deliver' | 'deliverPaid' | 'cancel')[] }) => {
    const [y, m, d] = o.date.split('-').map(Number);
    const created = new Date(Date.UTC(y, m - 1, d, 15) - o.daysBefore * 86400000);
    const r = await createOrder({
      cart: o.cart.map((c, i) => ({ id: `seed-${n}-${i}`, ...c })),
      purchaser: { phone: o.phone, name: o.name, email: o.email, locale: o.locale ?? 'fr' },
      delivery: { address: `${100 + n} rue Exemple`, city: o.city ?? 'Pointe-Claire', postalCode: o.postal, recipientName: o.recipient ?? '', deliveryDate: o.date, instructions: n % 3 === 0 ? 'Sonner à la porte arrière.' : '' },
      paymentMethod: o.pay, acceptTerms: true, idempotencyKey: `seed-order-${String(n++).padStart(4, '0')}-0000000000`,
    }, { now: created });
    if (!r.ok) throw new Error('seed order failed: ' + JSON.stringify(r));
    await prisma.order.update({ where: { id: r.order.id }, data: { createdAt: created } });
    for (const a of o.then ?? []) {
      const res = await applyAction(r.order.id, a, { actor: 'admin', now: new Date(created.getTime() + 3600_000) });
      if (!res.ok) throw new Error(`seed action ${a} failed: ${res.error}`);
    }
    return r.order;
  };
  const ready = (slug: string, quantity = 1, giftMessage = '') => ({ kind: 'READY', productId: prodIds[slug], quantity, giftMessage });
  const custom = (baseKey: string, lines: [string, number][], optionKeys: string[] = [], giftMessage = '') => ({ kind: 'CUSTOM', baseId: base[baseKey], lines: lines.map(([k, q]) => ({ componentId: item[k], quantity: q })), optionIds: optionKeys.map((k) => opt[k]), quantity: 1, giftMessage });

  const [pastSat2] = weekendDates(-2);
  const [pastSat1, pastSun1] = weekendDates(-1);
  const [sat0, sun0] = weekendDates(0);
  const [sat1] = weekendDates(1);

  // Marie — returning customer, same number typed three different ways
  await place({ phone: '514-555-0123', name: 'Marie Tremblay (démo)', email: 'marie.tremblay@example.com', cart: [ready('douceurs')], date: pastSat2, pay: 'INTERAC', postal: 'H9R 1A1', daysBefore: 8, then: ['markPaid', 'prepare', 'ready', 'deliver'] });
  await place({ phone: '(514) 555-0123', name: 'Marie Tremblay (démo)', email: 'marie.tremblay@example.com', cart: [custom('medium', [['chocolats-assortis', 2], ['cafe-moulu', 1], ['bougie-doree', 1]], ['decor'], 'Joyeuses fêtes, maman!')], date: pastSun1, pay: 'COD_CASH', postal: 'H9S 2B2', daysBefore: 6, recipient: 'Lise Tremblay', then: ['confirm', 'prepare', 'ready', 'deliverPaid'] });
  await place({ phone: '+1 514 555 0123', name: 'Marie Tremblay (démo)', email: 'marie.tremblay@example.com', cart: [ready('reveillon'), ready('petit-cadeau', 2, 'Bonne année!')], date: sat0, pay: 'INTERAC', postal: 'H9H 3C3', city: 'Kirkland', daysBefore: 3 });
  // Shared household number: different name & email -> flagged discrepancy, same operational customer, separate private history
  await place({ phone: '5145550123', name: 'Luc Gagnon (démo)', email: 'luc.gagnon@example.com', cart: [ready('cafe-the')], date: sun0, pay: 'COD_CASH', postal: 'H9W 1A1', city: 'Beaconsfield', daysBefore: 2 });
  // Jean-Philippe — active + completed + cancelled
  await place({ phone: '514-555-0142', name: 'Jean-Philippe Roy (démo)', email: 'jp.roy@example.com', cart: [ready('prestige')], date: pastSat1, pay: 'INTERAC', postal: 'H9A 2K2', city: 'Dollard-des-Ormeaux', daysBefore: 7, then: ['markPaid', 'prepare', 'ready', 'deliver'] });
  await place({ phone: '514-555-0142', name: 'Jean-Philippe Roy (démo)', email: 'jp.roy@example.com', cart: [ready('chaleureux'), custom('small', [['truffes-noires', 2], ['biscuits-decores', 1]])], date: sat0, pay: 'INTERAC', postal: 'H9A 2K2', city: 'Dollard-des-Ormeaux', daysBefore: 4, then: ['markPaid', 'prepare'] });
  await place({ phone: '514-555-0142', name: 'Jean-Philippe Roy (démo)', email: 'jp.roy@example.com', cart: [ready('petit-cadeau')], date: pastSat2, pay: 'COD_CASH', postal: 'H9A 2K2', city: 'Dollard-des-Ormeaux', daysBefore: 9, then: ['confirm', 'cancel'] });
  // Sophie — brand-new order
  await place({ phone: '438-555-0177', name: 'Sophie Lavoie (démo)', email: 'sophie.lavoie@example.com', cart: [custom('large', [['chocolats-assortis', 2], ['biscuits-beurre', 2], ['the-assortis', 1], ['cidre-pomme', 1], ['bougie-sapin', 1]], ['card', 'decor'], 'Merci pour tout!')], date: sat1, pay: 'COD_CASH', postal: 'H8N 1B1', city: 'LaSalle', daysBefore: 1 });
  // Amanda — English, Interac never paid -> expired
  await place({ phone: '450-555-0188', name: 'Amanda Clarke (demo)', email: 'amanda.clarke@example.com', locale: 'en', cart: [ready('douceurs')], date: pastSat1, pay: 'INTERAC', postal: 'H9X 3E3', city: 'Sainte-Anne-de-Bellevue', daysBefore: 6 });
  await expireReservations(new Date());
  void dayOfWeek;
}

main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
