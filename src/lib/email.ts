import { prisma } from './db';

export type EmailProvider = 'dev' | 'resend' | 'none';

export function emailProvider(): EmailProvider {
  const p = (process.env.EMAIL_PROVIDER ?? 'dev').toLowerCase();
  if (p === 'resend' && process.env.RESEND_API_KEY) return 'resend';
  // The development adapter can never run in production.
  if (p === 'dev' && process.env.NODE_ENV !== 'production') return 'dev';
  return 'none';
}

export const emailConfigured = () => emailProvider() !== 'none';

/** True only when development codes may be shown in the UI. Never true in production. */
export const showDevCodes = () => emailProvider() === 'dev' && process.env.NODE_ENV !== 'production';

export type Mail = { to: string; subject: string; text: string; html?: string; replyTo?: string };

export async function sendEmail(m: Mail): Promise<boolean> {
  const provider = emailProvider();
  try {
    if (provider === 'dev') {
      await prisma.devEmail.create({ data: { to: m.to, subject: m.subject, body: m.text } });
      if (process.env.NODE_ENV !== 'test') console.log(`[dev-email] → ${m.to.replace(/(.).+(@.+)/, '$1***$2')} :: ${m.subject}`);
      return true;
    }
    if (provider === 'resend') {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [m.to], subject: m.subject, text: m.text, html: m.html, reply_to: m.replyTo || undefined }),
      });
      return res.ok;
    }
  } catch (e) {
    console.error('[email] send failed', (e as Error).message);
  }
  return false;
}

const wrap = (title: string, body: string) =>
  `<div style="font-family:Georgia,serif;background:#FAF5EC;padding:24px"><div style="max-width:520px;margin:auto;background:#fff;border:1px solid #D4A64D;padding:28px"><h1 style="font-size:20px;color:#06271E;margin:0 0 16px">${title}</h1>${body}<p style="color:#62645D;font-size:12px;margin-top:24px">ED LUX GIFTS · Pointe-Claire, QC</p></div></div>`;

export function codeEmail(locale: 'fr' | 'en', code: string): Mail & { to: '' } {
  const fr = locale === 'fr';
  const subject = fr ? `Votre code de vérification ED LUX GIFTS : ${code}` : `Your ED LUX GIFTS verification code: ${code}`;
  const text = fr
    ? `Votre code de vérification est ${code}. Il expire dans 10 minutes. Si vous n’avez rien demandé, ignorez ce message.`
    : `Your verification code is ${code}. It expires in 10 minutes. If you didn’t request it, ignore this message.`;
  return { to: '', subject, text, html: wrap(fr ? 'Code de vérification' : 'Verification code', `<p style="font-size:28px;letter-spacing:6px;color:#06271E"><b>${code}</b></p><p>${text}</p>`) };
}

export function orderConfirmationEmail(o: { number: string; locale: 'fr' | 'en'; totalFormatted: string; deliveryDateFormatted: string; trackUrl: string; interac?: { email: string; amount: string } | null; cod: boolean }): Mail & { to: '' } {
  const fr = o.locale === 'fr';
  const subject = fr ? `Commande ${o.number} reçue — ED LUX GIFTS` : `Order ${o.number} received — ED LUX GIFTS`;
  const lines = [
    fr ? `Merci! Votre commande ${o.number} a bien été reçue.` : `Thank you! Your order ${o.number} was received.`,
    `${fr ? 'Livraison' : 'Delivery'}: ${o.deliveryDateFormatted}`,
    `${fr ? 'Total' : 'Total'}: ${o.totalFormatted}`,
  ];
  if (o.interac) lines.push(fr ? `Paiement non encore vérifié. Envoyez ${o.interac.amount} par virement Interac à ${o.interac.email} avec ${o.number} dans le message.` : `Payment is not verified yet. Send ${o.interac.amount} by Interac e-Transfer to ${o.interac.email} with ${o.number} in the message.`);
  if (o.cod) lines.push(fr ? `Le paiement sera perçu à la livraison (${o.totalFormatted}).` : `Payment will be collected on delivery (${o.totalFormatted}).`);
  lines.push(`${fr ? 'Suivre ma commande' : 'Track my order'}: ${o.trackUrl}`);
  return { to: '', subject, text: lines.join('\n'), html: wrap(subject, lines.map((l) => `<p>${l}</p>`).join('')) };
}
