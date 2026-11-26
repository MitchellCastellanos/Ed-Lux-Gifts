import { notFound } from 'next/navigation';
import { isLocale, makeT } from '@/i18n';
import { getSettings } from '@/lib/settings';
import { pageMeta } from '@/lib/seo';
import { PageHeading } from '@/components/ui';
import { weekdayName } from '@/lib/schedule';
import { formatTime } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return pageMeta({ locale, path: '/terms', title: makeT(locale)('footer.terms') });
}

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = makeT(locale);
  const s = await getSettings();
  const cut = `${weekdayName(s.schedule.cutoffDay, locale)} ${formatTime(s.schedule.cutoffTime, locale)}`;
  const fr = [
    ['Commandes', `Les commandes sont acceptées jusqu’au ${cut} pour la livraison du week-end suivant. Une commande est confirmée par notre équipe après réception.`],
    ['Prix et taxes', 'Les prix sont en dollars canadiens. Les taxes applicables, le cas échéant, sont affichées avant la soumission de la commande.'],
    ['Paiement', 'Virement Interac : la commande est réservée pour une durée limitée; elle est annulée automatiquement si le paiement n’est pas reçu à temps. Paiement à la livraison : le montant est perçu au moment de la remise du panier.'],
    ['Livraison', 'La livraison a lieu à la date choisie dans la zone desservie. Veuillez fournir une adresse exacte et un numéro joignable.'],
    ['Produits', 'Les paniers sont composés à la main; des substitutions de produits équivalents peuvent survenir en cas de rupture de stock. Les produits périssables doivent être conservés selon les indications.'],
    ['Annulation', 'Contactez-nous le plus tôt possible pour modifier ou annuler une commande avant sa préparation.'],
  ];
  const en = [
    ['Orders', `Orders are accepted until ${cut} for delivery the following weekend. An order is confirmed by our team after it is received.`],
    ['Prices and taxes', 'Prices are in Canadian dollars. Applicable taxes, if any, are shown before you submit your order.'],
    ['Payment', 'Interac e-Transfer: the order is reserved for a limited time and is automatically cancelled if payment is not received in time. Payment on delivery: the amount is collected when the basket is handed over.'],
    ['Delivery', 'Delivery takes place on the selected date within the service area. Please provide an exact address and a reachable phone number.'],
    ['Products', 'Baskets are assembled by hand; equivalent product substitutions may occur if an item is out of stock. Perishable items should be stored as indicated.'],
    ['Cancellation', 'Contact us as early as possible to change or cancel an order before it is prepared.'],
  ];
  return (
    <>
      <PageHeading title={t('footer.terms')} sub={t('legal.draft')} />
      <div className="container-page max-w-3xl space-y-7 py-8">
        {(locale === 'fr' ? fr : en).map(([h, p]) => (<section key={h}><h2 className="font-display text-xl font-semibold">{h}</h2><p className="mt-2 leading-relaxed">{p}</p></section>))}
        <p className="text-sm text-muted">{t('about.contactUs')} {s.business.email}</p>
      </div>
    </>
  );
}
