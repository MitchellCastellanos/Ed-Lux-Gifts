import crypto from 'crypto';
import { prisma } from './db';
import { rateLimit } from './rate-limit';
import { sendEmail, codeEmail, emailConfigured, showDevCodes } from './email';
import { normalizePhone } from './phone';
import { getSettings } from './settings';
import type { VerificationPurpose } from '@prisma/client';

const SECRET = () => {
  const s = process.env.APP_SECRET;
  if (!s && process.env.NODE_ENV === 'production') throw new Error('APP_SECRET is required in production');
  return s ?? 'dev-secret';
};
const hmac = (v: string) => crypto.createHmac('sha256', SECRET()).update(v).digest('hex');

export const CODE_TTL_MS = 10 * 60 * 1000;
export const RESEND_COOLDOWN_S = 60;
export const MAX_ATTEMPTS = 5;
export const SESSION_TTL_MS = 2 * 60 * 60 * 1000;
export const SESSION_COOKIE = 'edl_cs';

const codeHash = (email: string, phone: string, code: string, orderNumber?: string) => hmac(`${email}|${phone}|${orderNumber ?? ''}|${code}`);
const tokenHash = (t: string) => hmac(`session|${t}`);

export type RequestResult = { ok: true; devCode?: string } | { ok: false; reason: 'unavailable' | 'rate' };

/** Store scope: demo orders are only reachable while the store is in demo mode, live orders only in live mode. */
export async function currentIsDemo(): Promise<boolean> {
  return (await getSettings()).store.mode === 'demo';
}

async function issueCode(p: { purpose: VerificationPurpose; email: string; phoneE164: string; orderNumber?: string; isDemo: boolean; locale: 'fr' | 'en' }): Promise<{ sent: boolean; devCode?: string }> {
  const recent = await prisma.verificationCode.findFirst({ where: { email: p.email, phoneE164: p.phoneE164, purpose: p.purpose, consumedAt: null, createdAt: { gt: new Date(Date.now() - RESEND_COOLDOWN_S * 1000) } } });
  if (recent) return { sent: false }; // resend cooldown: silently skip (generic response)
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  await prisma.verificationCode.create({ data: { purpose: p.purpose, email: p.email, phoneE164: p.phoneE164, orderNumber: p.orderNumber, isDemo: p.isDemo, codeHash: codeHash(p.email, p.phoneE164, code, p.orderNumber), expiresAt: new Date(Date.now() + CODE_TTL_MS) } });
  const mail = codeEmail(p.locale, code);
  await sendEmail({ ...mail, to: p.email });
  return { sent: true, devCode: showDevCodes() ? code : undefined };
}

/** Request a code for full order history. Generic result: never reveals whether a match exists. */
export async function requestHistoryCode(phoneInput: string, emailInput: string, ip: string, locale: 'fr' | 'en'): Promise<RequestResult> {
  if (!emailConfigured()) return { ok: false, reason: 'unavailable' };
  const phone = normalizePhone(phoneInput);
  const email = emailInput.trim().toLowerCase();
  if (!(await rateLimit(`hist:ip:${ip}`, 10, 3600))) return { ok: false, reason: 'rate' };
  if (!phone.ok || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: true };
  if (!(await rateLimit(`hist:id:${email}:${phone.e164}`, 5, 3600))) return { ok: false, reason: 'rate' };
  const isDemo = await currentIsDemo();
  const match = await prisma.order.findFirst({ where: { purchaserPhoneE164: phone.e164, purchaserEmail: { equals: email, mode: 'insensitive' }, isDemo }, select: { id: true } });
  if (!match) return { ok: true };
  const r = await issueCode({ purpose: 'HISTORY', email, phoneE164: phone.e164, isDemo, locale });
  return { ok: true, devCode: r.devCode };
}

/** Request a code to recover a single order from number + phone. The code goes to the order's own email. */
export async function requestOrderCode(orderNumberInput: string, phoneInput: string, ip: string, locale: 'fr' | 'en'): Promise<RequestResult> {
  if (!emailConfigured()) return { ok: false, reason: 'unavailable' };
  const phone = normalizePhone(phoneInput);
  const number = orderNumberInput.trim().toUpperCase();
  if (!(await rateLimit(`ord:ip:${ip}`, 10, 3600))) return { ok: false, reason: 'rate' };
  if (!phone.ok || number.length < 5) return { ok: true };
  if (!(await rateLimit(`ord:id:${number}`, 5, 3600))) return { ok: false, reason: 'rate' };
  const isDemo = await currentIsDemo();
  const order = await prisma.order.findFirst({ where: { number, purchaserPhoneE164: phone.e164, isDemo } });
  if (!order) return { ok: true };
  const r = await issueCode({ purpose: 'ORDER', email: order.purchaserEmail.toLowerCase(), phoneE164: phone.e164, orderNumber: number, isDemo, locale });
  return { ok: true, devCode: r.devCode };
}

async function consumeCode(purpose: VerificationPurpose, email: string, phoneE164: string, code: string, orderNumber?: string): Promise<boolean> {
  const rec = await prisma.verificationCode.findFirst({ where: { purpose, email, phoneE164, orderNumber: orderNumber ?? null, consumedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'desc' } });
  if (!rec) return false;
  if (rec.attempts >= MAX_ATTEMPTS) return false;
  const given = Buffer.from(codeHash(email, phoneE164, code.trim(), orderNumber));
  const want = Buffer.from(rec.codeHash);
  const ok = given.length === want.length && crypto.timingSafeEqual(given, want);
  if (!ok) {
    await prisma.verificationCode.update({ where: { id: rec.id }, data: { attempts: { increment: 1 } } });
    return false;
  }
  // single use: only one concurrent request can flip consumedAt
  const res = await prisma.verificationCode.updateMany({ where: { id: rec.id, consumedAt: null }, data: { consumedAt: new Date() } });
  return res.count === 1;
}

export async function verifyHistoryCode(phoneInput: string, emailInput: string, code: string, ip: string): Promise<{ ok: true; token: string } | { ok: false }> {
  if (!(await rateLimit(`hist:verify:${ip}`, 30, 3600))) return { ok: false };
  const phone = normalizePhone(phoneInput);
  const email = emailInput.trim().toLowerCase();
  if (!phone.ok || !/^\d{6}$/.test(code.trim())) return { ok: false };
  if (!(await consumeCode('HISTORY', email, phone.e164, code))) return { ok: false };
  const isDemo = await currentIsDemo();
  const token = crypto.randomBytes(32).toString('base64url');
  await prisma.customerSession.create({ data: { tokenHash: tokenHash(token), email, phoneE164: phone.e164, isDemo, expiresAt: new Date(Date.now() + SESSION_TTL_MS) } });
  // mark the operational customer's email as verified when it matches
  await prisma.customer.updateMany({ where: { phoneE164: phone.e164, isDemo, email: { equals: email, mode: 'insensitive' }, emailVerifiedAt: null }, data: { emailVerifiedAt: new Date() } });
  return { ok: true, token };
}

export async function verifyOrderCode(orderNumberInput: string, phoneInput: string, code: string, ip: string): Promise<{ ok: true; publicToken: string } | { ok: false }> {
  if (!(await rateLimit(`ord:verify:${ip}`, 30, 3600))) return { ok: false };
  const phone = normalizePhone(phoneInput);
  const number = orderNumberInput.trim().toUpperCase();
  if (!phone.ok || !/^\d{6}$/.test(code.trim())) return { ok: false };
  const isDemo = await currentIsDemo();
  const order = await prisma.order.findFirst({ where: { number, purchaserPhoneE164: phone.e164, isDemo } });
  if (!order) return { ok: false };
  if (!(await consumeCode('ORDER', order.purchaserEmail.toLowerCase(), phone.e164, code, number))) return { ok: false };
  return { ok: true, publicToken: order.publicToken };
}

export async function getCustomerSession(token: string | undefined) {
  if (!token) return null;
  const s = await prisma.customerSession.findUnique({ where: { tokenHash: tokenHash(token) } });
  if (!s || s.expiresAt < new Date()) return null;
  return s;
}

export async function endCustomerSession(token: string | undefined) {
  if (!token) return;
  await prisma.customerSession.deleteMany({ where: { tokenHash: tokenHash(token) } });
}

/** Orders a verified session may see: must match BOTH the verified email and the phone, in the same data scope. */
export async function sessionOrders(s: { email: string; phoneE164: string; isDemo: boolean }) {
  return prisma.order.findMany({
    where: { purchaserPhoneE164: s.phoneE164, purchaserEmail: { equals: s.email, mode: 'insensitive' }, isDemo: s.isDemo },
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  });
}
