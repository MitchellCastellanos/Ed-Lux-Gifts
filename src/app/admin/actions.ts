'use server';
import { redirect } from 'next/navigation';
import { cookies, headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { auth, requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { getSettings, patchSetting, saveSetting, isFictionalEmail, type SettingsMap } from '@/lib/settings';
import { parseCents } from '@/lib/money';
import { normalizePrefix } from '@/lib/postal';
import { normalizePhone } from '@/lib/phone';
import { adjustStock, applyAction } from '@/lib/orders';
import { updateCustomerPhone, moveOrderToPhone } from '@/lib/customers';
import { sendEmail, emailConfigured } from '@/lib/email';
import { z } from 'zod';
import { anonymizeCustomer } from '@/lib/retention';

// ───────── helpers ─────────
const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
const int = (fd: FormData, k: string, d = 0) => { const n = parseInt(str(fd, k), 10); return Number.isFinite(n) ? n : d; };
const bool = (fd: FormData, k: string) => fd.get(k) === 'on' || fd.get(k) === 'true';
const lines = (fd: FormData, k: string) => str(fd, k).split('\n').map((s) => s.trim()).filter(Boolean);
const go = (path: string, q: Record<string, string> = { ok: '1' }): never => { revalidatePath(path); redirect(`${path}?${new URLSearchParams(q)}`); };
const slugify = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'item';
async function uniqueSlug(model: 'product' | 'collection', base: string, selfId?: string) {
  let slug = slugify(base), n = 1;
  for (;;) {
    const hit = await (prisma[model] as any).findUnique({ where: { slug } });
    if (!hit || hit.id === selfId) return slug;
    slug = `${slugify(base)}-${++n}`;
  }
}
async function actorEmail() { return (await requireAdmin()).user.email; }

// ───────── auth & locale ─────────
export async function loginAction(_: { error?: string } | undefined, fd: FormData): Promise<{ error?: string }> {
  const ip = clientIp(await headers());
  if (!(await rateLimit(`login:${ip}`, 10, 900))) return { error: 'rate' };
  try {
    await auth.api.signInEmail({ body: { email: str(fd, 'email'), password: String(fd.get('password') ?? '') }, headers: await headers() });
  } catch { return { error: 'invalid' }; }
  redirect('/admin/orders');
}
export async function logoutAction() {
  try { await auth.api.signOut({ headers: await headers() }); } catch {}
  redirect('/admin/login');
}
export async function setAdminLocale(locale: string) {
  (await cookies()).set('edl_locale', locale === 'en' ? 'en' : 'fr', { path: '/', maxAge: 31536000 });
  revalidatePath('/admin', 'layout');
}
export async function changePasswordAction(fd: FormData) {
  await requireAdmin();
  const next = String(fd.get('next') ?? '');
  if (next.length < 10 || next !== String(fd.get('confirm') ?? '')) return go('/admin/settings/account', { error: 'password' });
  try { await auth.api.changePassword({ body: { currentPassword: String(fd.get('current') ?? ''), newPassword: next, revokeOtherSessions: true }, headers: await headers() }); }
  catch { return go('/admin/settings/account', { error: 'currentPassword' }); }
  return go('/admin/settings/account');
}

// ───────── orders & customers ─────────
export async function saveOrderNotes(fd: FormData) {
  await requireAdmin();
  const id = str(fd, 'id');
  await prisma.order.update({ where: { id }, data: { internalNotes: str(fd, 'notes').slice(0, 2000) } });
  go(`/admin/orders/${id}`);
}
export async function saveCustomer(fd: FormData) {
  await requireAdmin();
  const id = str(fd, 'id');
  const email = str(fd, 'email').toLowerCase();
  if (email && !z.string().email().safeParse(email).success) return go(`/admin/orders/customers/${id}`, { error: 'email' });
  const cur = await prisma.customer.findUnique({ where: { id } });
  await prisma.customer.update({ where: { id }, data: { name: str(fd, 'name') || undefined, email: email || null, emailVerifiedAt: cur?.email?.toLowerCase() === email ? undefined : null, notes: str(fd, 'notes').slice(0, 3000) } });
  const phone = str(fd, 'phone');
  if (cur && phone && normalizePhone(phone).ok && (normalizePhone(phone) as any).e164 !== cur.phoneE164) {
    const r = await updateCustomerPhone(id, phone);
    if (!r.ok) return go(`/admin/orders/customers/${id}`, { error: r.error === 'collision' ? `collision:${r.collisionId}` : 'phone' });
  } else if (phone && !normalizePhone(phone).ok) return go(`/admin/orders/customers/${id}`, { error: 'phone' });
  go(`/admin/orders/customers/${id}`);
}
export async function moveOrderAction(fd: FormData) {
  await requireAdmin();
  const id = str(fd, 'id');
  const r = await moveOrderToPhone(id, str(fd, 'phone'));
  if (!r.ok) return go(`/admin/orders/${id}`, { error: 'phone' });
  go(`/admin/orders/${id}`);
}
export async function setOrdering(open: boolean) { await requireAdmin(); await patchSetting('schedule', { ordersOpen: open }); revalidatePath('/admin/orders'); }
export async function setWeekendClosed(fd: FormData) {
  await requireAdmin();
  const dates = lines(fd, 'dates');
  const s = (await getSettings()).schedule;
  const closed = bool(fd, 'close');
  const set = new Set(s.closedDates);
  for (const d of dates) { if (closed) set.add(d); else set.delete(d); }
  await patchSetting('schedule', { closedDates: [...set].sort() });
  go(str(fd, 'back') || '/admin/orders');
}
export async function orderActionForm(fd: FormData) {
  const email = await actorEmail();
  const id = str(fd, 'id');
  const r = await applyAction(id, str(fd, 'action') as any, { actor: email, note: str(fd, 'note') || undefined });
  go(`/admin/orders/${id}`, r.ok ? { ok: '1' } : { error: r.error });
}

// ───────── catalog: components ─────────
const firstLine = (fd: FormData, k: string) => lines(fd, k)[0] ?? null;
export async function saveComponent(fd: FormData) {
  await requireAdmin();
  const id = str(fd, 'id');
  const kind = z.enum(['ITEM', 'BASE', 'PRESENTATION']).parse(str(fd, 'kind'));
  const back = kind === 'BASE' ? '/admin/catalog/bases' : '/admin/catalog/items';
  const nameFr = str(fd, 'nameFr'), nameEn = str(fd, 'nameEn');
  const price = parseCents(str(fd, 'price') || '0');
  if (!(nameFr || nameEn) || price == null) return go(id ? `${back}/${id}` : `${back}/new`, { error: 'invalid', ...(kind !== 'BASE' ? { kind } : {}) });
  const data: any = {
    kind, nameFr: nameFr || nameEn, nameEn: nameEn || nameFr, descFr: str(fd, 'descFr'), descEn: str(fd, 'descEn'), imageUrl: firstLine(fd, 'image'),
    priceCents: price, active: bool(fd, 'active'), isDemo: false, lowStockThreshold: Math.max(0, int(fd, 'low', 3)),
    categoryId: kind === 'ITEM' ? str(fd, 'categoryId') || null : null,
    capacityCost: kind === 'ITEM' ? Math.max(0, int(fd, 'capacityCost', 1)) : 0,
    capacity: kind === 'BASE' ? Math.max(1, int(fd, 'capacity', 8)) : 0,
    includedOptionIds: kind === 'BASE' ? fd.getAll('included').map(String) : [],
    customEligible: kind === 'ITEM' ? bool(fd, 'customEligible') : true,
  };
  if (id) await prisma.component.update({ where: { id }, data });
  else {
    const c = await prisma.component.create({ data: { ...data, stockOnHand: Math.max(0, int(fd, 'stock', 0)) } });
    if (c.stockOnHand) await prisma.stockAdjustment.create({ data: { componentId: c.id, delta: c.stockOnHand, newOnHand: c.stockOnHand, reason: 'initial', actor: await actorEmail() } });
  }
  go(back);
}
export async function componentState(fd: FormData) {
  await requireAdmin();
  const id = str(fd, 'id'), op = str(fd, 'op');
  const c = await prisma.component.findUniqueOrThrow({ where: { id } });
  const back = c.kind === 'BASE' ? '/admin/catalog/bases' : '/admin/catalog/items';
  if (op === 'archive') await prisma.component.update({ where: { id }, data: { archived: true, active: false } });
  else if (op === 'restore') await prisma.component.update({ where: { id }, data: { archived: false, active: true } });
  else if (op === 'delete') {
    const refs = (await prisma.productComponent.count({ where: { componentId: id } })) + (await prisma.orderStockLine.count({ where: { componentId: id } })) + (await prisma.component.count({ where: { includedOptionIds: { has: id } } }));
    if (refs > 0) { await prisma.component.update({ where: { id }, data: { archived: true, active: false } }); return go(back, { ok: '1', note: 'archived' }); }
    await prisma.stockAdjustment.deleteMany({ where: { componentId: id } });
    await prisma.component.delete({ where: { id } });
  }
  go(back);
}
export async function adjustStockAction(fd: FormData) {
  const email = await actorEmail();
  const id = str(fd, 'id');
  const mode = str(fd, 'mode');
  const v = parseInt(str(fd, 'value'), 10);
  if (!Number.isFinite(v)) return go('/admin/catalog/inventory', { error: 'invalid' });
  const r = await adjustStock(id, mode === 'add' ? { delta: v, actor: email, reason: str(fd, 'reason') } : { setTo: v, actor: email, reason: str(fd, 'reason') });
  go('/admin/catalog/inventory', r.ok ? { ok: '1' } : { error: r.error });
}
export async function saveCategory(fd: FormData) {
  await requireAdmin();
  const id = str(fd, 'id'), nameFr = str(fd, 'nameFr'), nameEn = str(fd, 'nameEn');
  if (!(nameFr || nameEn)) return go('/admin/catalog/categories', { error: 'invalid' });
  const data = { nameFr: nameFr || nameEn, nameEn: nameEn || nameFr, sortOrder: int(fd, 'sort'), active: bool(fd, 'active'), isDemo: false };
  if (id) await prisma.category.update({ where: { id }, data });
  else await prisma.category.create({ data: { ...data, slug: slugify(nameFr || nameEn) + '-' + Math.random().toString(36).slice(2, 6) } });
  go('/admin/catalog/categories');
}
export async function deleteCategory(fd: FormData) {
  await requireAdmin();
  const id = str(fd, 'id');
  if ((await prisma.component.count({ where: { categoryId: id } })) > 0) return go('/admin/catalog/categories', { error: 'categoryInUse' });
  await prisma.category.delete({ where: { id } });
  go('/admin/catalog/categories');
}

// ───────── catalog: gift baskets ─────────
export async function saveProduct(fd: FormData) {
  await requireAdmin();
  const id = str(fd, 'id');
  const nameFr = str(fd, 'nameFr'), nameEn = str(fd, 'nameEn');
  const price = parseCents(str(fd, 'price'));
  let recipe: { componentId: string; quantity: number }[] = [];
  try { recipe = z.array(z.object({ componentId: z.string().uuid(), quantity: z.number().int().min(1).max(99) })).parse(JSON.parse(str(fd, 'recipe') || '[]')); } catch { return go(id ? `/admin/catalog/baskets/${id}` : '/admin/catalog/baskets/new', { error: 'invalid' }); }
  if (!(nameFr || nameEn) || price == null) return go(id ? `/admin/catalog/baskets/${id}` : '/admin/catalog/baskets/new', { error: 'invalid' });
  const known = await prisma.component.count({ where: { id: { in: recipe.map((r) => r.componentId) } } });
  if (known !== new Set(recipe.map((r) => r.componentId)).size) return go('/admin/catalog/baskets', { error: 'invalid' });
  const urls = lines(fd, 'images');
  const data = { nameFr: nameFr || nameEn, nameEn: nameEn || nameFr, descFr: str(fd, 'descFr'), descEn: str(fd, 'descEn'), priceCents: price, featured: bool(fd, 'featured'), active: bool(fd, 'active'), isDemo: false };
  const colIds = fd.getAll('collectionIds').map(String);
  await prisma.$transaction(async (tx) => {
    const p = id ? await tx.product.update({ where: { id }, data }) : await tx.product.create({ data: { ...data, slug: await uniqueSlug('product', nameFr || nameEn) } });
    await tx.productComponent.deleteMany({ where: { productId: p.id } });
    await tx.productComponent.createMany({ data: recipe.map((r) => ({ productId: p.id, ...r })) });
    await tx.productImage.deleteMany({ where: { productId: p.id } });
    await tx.productImage.createMany({ data: urls.map((url, i) => ({ productId: p.id, url, sortOrder: i, altFr: nameFr, altEn: nameEn })) });
    await tx.productCollection.deleteMany({ where: { productId: p.id } });
    await tx.productCollection.createMany({ data: colIds.map((collectionId) => ({ productId: p.id, collectionId })) });
  });
  go('/admin/catalog/baskets');
}
export async function productState(fd: FormData) {
  await requireAdmin();
  const id = str(fd, 'id'), op = str(fd, 'op');
  if (op === 'archive') await prisma.product.update({ where: { id }, data: { archived: true, active: false } });
  else if (op === 'restore') await prisma.product.update({ where: { id }, data: { archived: false, active: true } });
  else if (op === 'toggle') { const p = await prisma.product.findUniqueOrThrow({ where: { id } }); await prisma.product.update({ where: { id }, data: { active: !p.active } }); }
  else if (op === 'feature') { const p = await prisma.product.findUniqueOrThrow({ where: { id } }); await prisma.product.update({ where: { id }, data: { featured: !p.featured } }); }
  else if (op === 'delete') {
    if ((await prisma.orderItem.count({ where: { productId: id } })) > 0) { await prisma.product.update({ where: { id }, data: { archived: true, active: false } }); return go('/admin/catalog/baskets', { ok: '1', note: 'archived' }); }
    await prisma.product.delete({ where: { id } });
  }
  go(str(fd, 'back') || '/admin/catalog/baskets');
}

// ───────── storefront ─────────
export async function saveCollection(fd: FormData) {
  await requireAdmin();
  const id = str(fd, 'id');
  const nameFr = str(fd, 'nameFr'), nameEn = str(fd, 'nameEn');
  if (!(nameFr || nameEn)) return go(id ? `/admin/storefront/collections/${id}` : '/admin/storefront/collections/new', { error: 'invalid' });
  const data = { nameFr: nameFr || nameEn, nameEn: nameEn || nameFr, descFr: str(fd, 'descFr'), descEn: str(fd, 'descEn'), imageUrl: firstLine(fd, 'image'), active: bool(fd, 'active'), sortOrder: int(fd, 'sort'), isDemo: false };
  const productIds = fd.getAll('productIds').map(String);
  await prisma.$transaction(async (tx) => {
    const c = id ? await tx.collection.update({ where: { id }, data }) : await tx.collection.create({ data: { ...data, slug: await uniqueSlug('collection', nameFr || nameEn) } });
    await tx.productCollection.deleteMany({ where: { collectionId: c.id } });
    await tx.productCollection.createMany({ data: productIds.map((productId) => ({ productId, collectionId: c.id })) });
  });
  go('/admin/storefront/collections');
}
export async function collectionState(fd: FormData) {
  await requireAdmin();
  const id = str(fd, 'id'), op = str(fd, 'op');
  await prisma.collection.update({ where: { id }, data: op === 'archive' ? { archived: true, active: false } : op === 'restore' ? { archived: false, active: true } : { active: op === 'activate' } });
  go('/admin/storefront/collections');
}
function dateOrNull(s: string) { if (!s) return null; const d = new Date(s); return isNaN(+d) ? null : d; }
export async function saveCampaign(fd: FormData) {
  await requireAdmin();
  const id = str(fd, 'id');
  const headlineFr = str(fd, 'headlineFr'), headlineEn = str(fd, 'headlineEn');
  if (!(headlineFr || headlineEn) || !str(fd, 'name')) return go(id ? `/admin/storefront/campaigns/${id}` : '/admin/storefront/campaigns/new', { error: 'invalid' });
  const data = {
    name: str(fd, 'name'), eyebrowFr: str(fd, 'eyebrowFr'), eyebrowEn: str(fd, 'eyebrowEn'), headlineFr: headlineFr || headlineEn, headlineEn: headlineEn || headlineFr, descFr: str(fd, 'descFr'), descEn: str(fd, 'descEn'),
    ctaFr: str(fd, 'ctaFr'), ctaEn: str(fd, 'ctaEn'), taglineFr: str(fd, 'taglineFr'), taglineEn: str(fd, 'taglineEn'), desktopImage: firstLine(fd, 'desktopImage'), mobileImage: firstLine(fd, 'mobileImage'),
    collectionId: str(fd, 'collectionId') || null, accent: str(fd, 'accent') || 'gold', published: bool(fd, 'published'), startsAt: dateOrNull(str(fd, 'startsAt')), endsAt: dateOrNull(str(fd, 'endsAt')), isDemo: false,
  };
  if (id) await prisma.campaign.update({ where: { id }, data }); else await prisma.campaign.create({ data });
  go('/admin/storefront/campaigns');
}
export async function campaignState(fd: FormData) {
  await requireAdmin();
  const id = str(fd, 'id'), op = str(fd, 'op');
  if (op === 'delete') await prisma.campaign.delete({ where: { id } });
  else await prisma.campaign.update({ where: { id }, data: { published: op === 'publish' } });
  go('/admin/storefront/campaigns');
}

// ───────── delivery zones ─────────
export async function saveZone(fd: FormData) {
  await requireAdmin();
  const id = str(fd, 'id');
  const name = str(fd, 'name');
  const fee = parseCents(str(fd, 'fee') || '0');
  const freeRaw = str(fd, 'free');
  const free = freeRaw ? parseCents(freeRaw) : null;
  if (!name || fee == null || (freeRaw && free == null)) return go('/admin/settings/delivery', { error: 'invalid' });
  const raw = str(fd, 'prefixes').split(/[\s,;]+/).filter(Boolean);
  const prefixes: string[] = [];
  for (const p of raw) { const n = normalizePrefix(p); if (!n) return go('/admin/settings/delivery', { error: `prefix:${p}` }); if (!prefixes.includes(n)) prefixes.push(n); }
  const taken = await prisma.deliveryZonePrefix.findMany({ where: { prefix: { in: prefixes }, ...(id ? { NOT: { zoneId: id } } : {}) }, include: { zone: true } });
  if (taken.length) return go('/admin/settings/delivery', { error: `conflict:${taken[0].prefix}:${taken[0].zone.name}` });
  await prisma.$transaction(async (tx) => {
    const data = { name, areas: str(fd, 'areas'), feeCents: fee, freeThresholdCents: free, active: bool(fd, 'active'), verified: bool(fd, 'verified') };
    const z = id ? await tx.deliveryZone.update({ where: { id }, data }) : await tx.deliveryZone.create({ data });
    await tx.deliveryZonePrefix.deleteMany({ where: { zoneId: z.id } });
    await tx.deliveryZonePrefix.createMany({ data: prefixes.map((prefix) => ({ prefix, zoneId: z.id })) });
  });
  go('/admin/settings/delivery');
}
export async function deleteZone(fd: FormData) { await requireAdmin(); await prisma.deliveryZone.delete({ where: { id: str(fd, 'id') } }); go('/admin/settings/delivery'); }

// ───────── settings ─────────
export async function saveBusiness(fd: FormData) {
  await requireAdmin();
  const email = str(fd, 'email');
  if (email && !z.string().email().safeParse(email).success) return go('/admin/settings/business', { error: 'email' });
  await patchSetting('business', { name: str(fd, 'name') || 'ED LUX GIFTS', email, phone: str(fd, 'phone'), addressLine: str(fd, 'addressLine'), city: str(fd, 'city'), postalCode: str(fd, 'postalCode'), instagram: str(fd, 'instagram'), facebook: str(fd, 'facebook'), aboutFr: str(fd, 'aboutFr'), aboutEn: str(fd, 'aboutEn'), hoursFr: str(fd, 'hoursFr'), hoursEn: str(fd, 'hoursEn'), verified: bool(fd, 'verified') });
  await patchSetting('retention', { orderRetentionMonths: Math.min(120, Math.max(12, int(fd, 'retention', 84))) });
  go('/admin/settings/business');
}
export async function savePayments(fd: FormData) {
  await requireAdmin();
  await patchSetting('payments', { interacEnabled: bool(fd, 'interacEnabled'), interacEmail: str(fd, 'interacEmail'), interacInstructionsFr: str(fd, 'interacInstructionsFr'), interacInstructionsEn: str(fd, 'interacInstructionsEn'), interacDeadlineHours: Math.min(336, Math.max(1, int(fd, 'deadline', 48))), codEnabled: bool(fd, 'codEnabled'), codCash: bool(fd, 'codCash'), codInterac: bool(fd, 'codInterac') });
  go('/admin/settings/payments');
}
export async function saveSchedule(fd: FormData) {
  await requireAdmin();
  const days = fd.getAll('days').map((d) => parseInt(String(d), 10)).filter((n) => n >= 0 && n <= 6);
  if (!days.length) return go('/admin/settings/schedule', { error: 'days' });
  const time = /^\d{2}:\d{2}$/.test(str(fd, 'cutoffTime')) ? str(fd, 'cutoffTime') : '13:00';
  const closed = lines(fd, 'closedDates').filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));
  await patchSetting('schedule', { ordersOpen: bool(fd, 'ordersOpen'), cutoffDay: int(fd, 'cutoffDay', 5), cutoffTime: time, deliveryDays: days, maxAdvanceWeeks: Math.min(12, Math.max(1, int(fd, 'weeks', 3))), maxOrdersPerDay: Math.max(0, int(fd, 'maxOrders', 12)), closedDates: [...new Set(closed)].sort() });
  go('/admin/settings/schedule');
}
export async function saveTax(fd: FormData) {
  await requireAdmin();
  const num = (k: string) => { const n = parseFloat(str(fd, k).replace(',', '.')); return Number.isFinite(n) ? n : 0; };
  await patchSetting('tax', { mode: z.enum(['none', 'gst_qst', 'custom']).parse(str(fd, 'mode')), gstRatePct: num('gst'), qstRatePct: num('qst'), customRatePct: num('custom'), customLabel: str(fd, 'customLabel') || 'Tax', applyToDelivery: bool(fd, 'applyToDelivery'), confirmedByOwner: bool(fd, 'confirmedByOwner') });
  go('/admin/settings/taxes');
}
export async function saveEmailSettings(fd: FormData) {
  await requireAdmin();
  await patchSetting('email', { senderName: str(fd, 'senderName') || 'ED LUX GIFTS', replyTo: str(fd, 'replyTo') });
  go('/admin/settings/communications');
}
export async function sendTestEmail() {
  const email = await actorEmail();
  if (!emailConfigured()) return go('/admin/settings/communications', { error: 'emailOff' });
  const ok = await sendEmail({ to: email, subject: 'ED LUX GIFTS — test', text: 'Email delivery works.' });
  if (ok) await patchSetting('email', { historyVerificationTested: true });
  go('/admin/settings/communications', ok ? { ok: '1' } : { error: 'emailFail' });
}

// ───────── launch & demo tools ─────────
export async function toggleOnboarding(fd: FormData) {
  await requireAdmin();
  const s = (await getSettings()).store;
  await saveSetting('store', { ...s, onboarding: { ...s.onboarding, [str(fd, 'key')]: bool(fd, 'done') } } as SettingsMap['store']);
  go('/admin/settings/launch');
}
export async function goLive() {
  await requireAdmin();
  const [s, zones] = await Promise.all([getSettings(), prisma.deliveryZone.findMany({ where: { active: true } })]);
  const problems: string[] = [];
  if (!s.business.verified) problems.push('business');
  if (s.payments.interacEnabled && isFictionalEmail(s.payments.interacEmail)) problems.push('interac');
  if (!zones.length || zones.some((z) => !z.verified)) problems.push('zones');
  if (!s.tax.confirmedByOwner) problems.push('tax');
  if (!emailConfigured()) problems.push('email');
  if (!s.email.historyVerificationTested) problems.push('emailTest');
  if (problems.length) return go('/admin/settings/launch', { error: `launch:${problems.join(',')}` });
  await patchSetting('store', { mode: 'live' });
  go('/admin/settings/launch');
}
export async function demoCleanup(fd: FormData) {
  await requireAdmin();
  const what = str(fd, 'what');
  if (what === 'orders') {
    const orders = await prisma.order.findMany({ where: { isDemo: true, inventoryState: 'RESERVED' }, select: { id: true } });
    for (const o of orders) await applyAction(o.id, 'cancel', { actor: 'cleanup' }); // releases reserved stock first
    await prisma.order.deleteMany({ where: { isDemo: true } });
  } else if (what === 'customers') {
    await prisma.customer.deleteMany({ where: { isDemo: true, orders: { none: {} } } });
  } else if (what === 'catalog') {
    // only untouched demo entries; anything the owner edited (isDemo=false) or that real data references is preserved
    const comps = await prisma.component.findMany({ where: { isDemo: true } });
    const realProducts = await prisma.productComponent.findMany({ where: { product: { isDemo: false } }, select: { componentId: true } });
    const keep = new Set(realProducts.map((r) => r.componentId));
    (await prisma.component.findMany({ where: { isDemo: false, kind: 'BASE' }, select: { includedOptionIds: true } })).forEach((b) => b.includedOptionIds.forEach((i) => keep.add(i)));
    (await prisma.orderStockLine.findMany({ select: { componentId: true } })).forEach((l) => keep.add(l.componentId));
    await prisma.campaign.deleteMany({ where: { isDemo: true } });
    const demoProducts = await prisma.product.findMany({ where: { isDemo: true }, select: { id: true } });
    for (const p of demoProducts) {
      if ((await prisma.orderItem.count({ where: { productId: p.id } })) > 0) await prisma.product.update({ where: { id: p.id }, data: { archived: true, active: false } });
      else await prisma.product.delete({ where: { id: p.id } });
    }
    await prisma.collection.deleteMany({ where: { isDemo: true, products: { none: {} } } });
    for (const c of comps) if (!keep.has(c.id)) { await prisma.stockAdjustment.deleteMany({ where: { componentId: c.id } }); await prisma.component.delete({ where: { id: c.id } }).catch(() => {}); }
    await prisma.category.deleteMany({ where: { isDemo: true, components: { none: {} } } });
  }
  go('/admin/settings/launch');
}

export async function anonymizeCustomerAction(fd: FormData) {
  await requireAdmin();
  const id = str(fd, 'id');
  const r = await anonymizeCustomer(id);
  go(`/admin/orders/customers/${id}`, r.ok ? { ok: '1' } : { error: r.error });
}
