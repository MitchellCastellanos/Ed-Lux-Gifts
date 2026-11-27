import { notFound } from 'next/navigation';
import { isLocale, makeT } from '@/i18n';
import { getSettings } from '@/lib/settings';
import { pageMeta } from '@/lib/seo';
import { PageHeading } from '@/components/ui';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return pageMeta({ locale, path: '/privacy', title: makeT(locale)('footer.privacy') });
}

const COPY = {
  fr: [
    ['Renseignements que nous recueillons', 'Pour traiter votre commande, nous recueillons : votre nom, votre numéro de téléphone, votre courriel, l’adresse de livraison, le nom et le numéro du destinataire (si différent), vos instructions de livraison et le contenu de votre commande. Nous ne recueillons aucun renseignement de carte de paiement : le paiement se fait par virement Interac ou à la livraison.'],
    ['Pourquoi nous les utilisons', 'Votre numéro de téléphone nous sert à retrouver vos commandes et à vous joindre au besoin. Votre courriel sert uniquement à vous envoyer les codes de vérification pour consulter vos commandes. Nous n’envoyons aucune infolettre ni publicité et ne vendons jamais vos renseignements.'],
    ['Accès à vos commandes', 'Un numéro de téléphone seul ne donne jamais accès à vos commandes. Pour consulter l’historique, un code à usage unique est envoyé à votre courriel.'],
    ['Fournisseurs de services', 'Hébergement de l’application et de la base de données, envoi de courriels transactionnels et stockage d’images de produits. Ces fournisseurs peuvent traiter des données à l’extérieur du Québec.'],
    ['Témoins et stockage local', 'Nous utilisons le stockage de votre navigateur pour conserver votre panier et votre langue, et un témoin de session temporaire lorsque vous consultez vos commandes. Aucun témoin publicitaire n’est utilisé.'],
    ['Conservation', 'Les commandes sont conservées {months} mois à des fins comptables et de service à la clientèle, puis détruites ou anonymisées.'],
    ['Vos droits', 'Vous pouvez demander l’accès à vos renseignements, leur correction ou leur suppression (sous réserve des documents que nous devons conserver) en nous écrivant à {email}.'],
    ['Responsable', 'La personne responsable de la protection des renseignements personnels est la propriétaire de l’entreprise : {email}.'],
  ],
  en: [
    ['Information we collect', 'To process your order we collect: your name, phone number, email, delivery address, the recipient’s name and phone (if different), delivery instructions and the contents of your order. We do not collect payment card information: payment is by Interac e-Transfer or on delivery.'],
    ['Why we use it', 'Your phone number helps us find your orders and contact you if needed. Your email is used only to send the verification codes used to view your orders. We send no newsletters or advertising and never sell your information.'],
    ['Access to your orders', 'A phone number alone never gives access to your orders. To view your history, a one-time code is sent to your email.'],
    ['Service providers', 'Application and database hosting, transactional email delivery and product image storage. These providers may process data outside Québec.'],
    ['Cookies and local storage', 'We use your browser’s storage to keep your cart and language, and a temporary session cookie when you view your orders. No advertising cookies are used.'],
    ['Retention', 'Orders are kept for {months} months for accounting and customer-service purposes, then deleted or anonymized.'],
    ['Your rights', 'You may request access to, correction of, or deletion of your information (subject to records we must retain) by writing to {email}.'],
    ['Person responsible', 'The person responsible for the protection of personal information is the business owner: {email}.'],
  ],
};

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = makeT(locale);
  const s = await getSettings();
  return (
    <>
      <PageHeading title={t('footer.privacy')} sub={t('legal.draft')} />
      <div className="container-page max-w-3xl space-y-7 py-8">
        {COPY[locale].map(([h, p]) => (<section key={h}><h2 className="font-display text-xl font-semibold">{h}</h2><p className="mt-2 leading-relaxed">{p.replace('{months}', String(s.retention.orderRetentionMonths)).replaceAll('{email}', s.business.email)}</p></section>))}
      </div>
    </>
  );
}
