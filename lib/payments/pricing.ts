/**
 * Catalogue tarifaire expérimental - diaspora vs Afrique francophone (zone XOF).
 *
 * Constat marché : 9,99 €/mois ≈ 6 560 XOF ≈ ~15 % du SMIC burkinabè. Inadapté
 * en masse locale. Les valeurs ci-dessous modélisent un futur palier local et
 * servent aux tests produit ; elles ne sont pas proposées à l'achat.
 *
 * Cette logique est PURE et DORMANTE. Aucune route checkout ni aucun webhook
 * ne consomme actuellement `priceOffer`; la facturation active reste Stripe et
 * son montant réel vient du Price configuré. Ne pas afficher ces valeurs avant
 * d'avoir branché et audité toute la réconciliation Flutterwave.
 */

export type PriceProvider = "stripe" | "flutterwave";

export type PriceOffer = {
  /** Rail de paiement à utiliser pour cette offre. */
  provider: PriceProvider;
  /** Devise ISO 4217. */
  currency: "EUR" | "XOF";
  /** Montant dans l'unité usuelle de la devise (EUR: 9.99 ; XOF: 2000, sans décimale). */
  amount: number;
  /** Période d'abonnement. */
  interval: "month";
};

/**
 * Pays de la zone UEMOA (franc CFA Ouest, XOF). On ne reconnaît QUE ces pays
 * comme « locaux » ; tout pays inconnu/absent tombe sur le palier diaspora
 * (jamais de sous-facturation par erreur).
 */
const XOF_IDENTIFIERS: ReadonlySet<string> = new Set([
  // Codes ISO 3166-1 alpha-2
  "bf",
  "ci",
  "sn",
  "ml",
  "ne",
  "tg",
  "bj",
  "gw",
  // Noms usuels (fr/en) normalisés en minuscules
  "burkina faso",
  "burkina",
  "côte d'ivoire",
  "cote d'ivoire",
  "ivory coast",
  "sénégal",
  "senegal",
  "mali",
  "niger",
  "togo",
  "bénin",
  "benin",
  "guinée-bissau",
  "guinee-bissau",
  "guinea-bissau",
]);

/** Vrai si le pays appartient à la zone XOF (UEMOA). Robuste à la casse/espaces. */
export function isLocalXofCountry(country?: string | null): boolean {
  if (!country) return false;
  return XOF_IDENTIFIERS.has(country.trim().toLowerCase());
}

// Montants surchargeables par variable d'env (sinon défauts validés produit).
const LOCAL_XOF = Number(process.env.PREMIUM_PRICE_XOF) || 2000;
const DIASPORA_EUR = Number(process.env.PREMIUM_PRICE_EUR) || 9.99;

/**
 * Offre de catalogue envisagée selon le pays de l'utilisateur.
 * - Zone XOF (UEMOA) -> Mobile Money via Flutterwave, 2 000 XOF/mois.
 * - Ailleurs / inconnu -> Stripe (CB), 9,99 €/mois.
 */
export function priceOffer(country?: string | null): PriceOffer {
  if (isLocalXofCountry(country)) {
    return {
      provider: "flutterwave",
      currency: "XOF",
      amount: LOCAL_XOF,
      interval: "month",
    };
  }
  return {
    provider: "stripe",
    currency: "EUR",
    amount: DIASPORA_EUR,
    interval: "month",
  };
}

/** Libellé prix prêt à afficher (ex. « 2 000 XOF / mois », « 9,99 € / mois »). */
export function formatOffer(offer: PriceOffer, locale = "fr"): string {
  if (offer.currency === "XOF") {
    const n = new Intl.NumberFormat(locale).format(offer.amount);
    return `${n} XOF / mois`;
  }
  const n = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(offer.amount);
  return `${n} € / mois`;
}
