/**
 * Garde d'accès anti-dark-pattern — INVARIANT DOCTRINAL de Chemin d'Alliance.
 *
 * « Pas un swipe de plus » : la protection, le signalement, la sortie et la
 * confidentialité de base ne se monétisent JAMAIS. Ce module rend ce principe
 * STRUCTUREL et non pas seulement déclaratif :
 *
 *  - FREE_FOREVER liste les fonctionnalités gratuites à vie. canAccess() y
 *    répond toujours `true`, quel que soit l'abonnement.
 *  - assertGatable() lève une erreur si un développeur tente un jour de placer
 *    une de ces fonctionnalités derrière un paywall -> dark pattern impossible.
 *  - Un invariant vérifié au chargement interdit toute intersection
 *    FREE_FOREVER ∩ PREMIUM (échec immédiat au boot si violé).
 *
 * À mettre en place AVANT le premier palier payant : tout point de paywall
 * futur DOIT passer par assertGatable() + canAccess().
 */
import { paymentProvider } from "./provider";

/**
 * Gratuit à vie — dignité, sécurité, RGPD. Jamais derrière un paywall.
 * Reflète la contrainte fondatrice : « blocage, signalement, suppression de
 * compte et filtres de base ne sont jamais derrière un paywall ».
 */
export const FREE_FOREVER = [
  "block_user", // blocage d'un profil
  "report_user", // signalement / modération
  "delete_account", // suppression / anonymisation RGPD
  "export_data", // portabilité RGPD
  "consent_management", // gestion / révocation des consentements
  "contact_privacy", // contrôle du partage des coordonnées
  "basic_filters", // foi, âge, intention — filtres de base
  "guardian_checkin", // agent de sécurité (check-in privé)
  "emergency_resources", // numéros d'urgence
  "exit_helper", // aide à la sortie / reconstruction
] as const;
export type FreeFeature = (typeof FREE_FOREVER)[number];

/**
 * Fonctionnalités qu'un palier payant PEUT débloquer. Doit rester DISJOINTE
 * de FREE_FOREVER (vérifié au chargement). N'inclut jamais sécurité/dignité.
 */
export const PREMIUM_FEATURES = [
  "advanced_filters", // filtres fins (distance, langues, etc.)
  "unlimited_discovery", // découverte sans quota quotidien
  "deep_discernement_report", // rapport de discernement approfondi
  "internal_calls", // appels audio/vidéo internes gradués
  "priority_coach_session", // session coach humain prioritaire
  "premium_llm_tier", // palier LLM premium (nuance maximale)
] as const;
export type PremiumFeature = (typeof PREMIUM_FEATURES)[number];

export type Feature = FreeFeature | PremiumFeature;
export type Plan = "free" | "active";

// Invariant doctrinal vérifié au CHARGEMENT du module : aucune fonctionnalité
// ne peut être à la fois gratuite à vie et payante. Échec immédiat si violé.
const FREE_SET: ReadonlySet<string> = new Set(FREE_FOREVER);
for (const f of PREMIUM_FEATURES) {
  if (FREE_SET.has(f)) {
    throw new Error(
      `[entitlements] "${f}" ne peut être à la fois GRATUIT À VIE et PREMIUM.`,
    );
  }
}

export function isFreeForever(feature: string): feature is FreeFeature {
  return FREE_SET.has(feature);
}

const PREMIUM_SET: ReadonlySet<string> = new Set(PREMIUM_FEATURES);
export function isPremium(feature: string): feature is PremiumFeature {
  return PREMIUM_SET.has(feature);
}

/**
 * Garde structurelle. À appeler sur TOUT point de paywall. Lève si l'on tente
 * de restreindre une fonctionnalité gratuite à vie — l'anti-dark-pattern n'est
 * alors pas qu'une consigne mais une impossibilité du code.
 */
export function assertGatable(
  feature: Feature,
): asserts feature is PremiumFeature {
  if (isFreeForever(feature)) {
    throw new Error(
      `[entitlements] "${feature}" est GRATUIT À VIE et ne peut jamais être placé derrière un paywall.`,
    );
  }
}

/**
 * Vérifie l'accès à une fonctionnalité pour un palier donné.
 * - Gratuit à vie  -> toujours accessible.
 * - Premium        -> requiert un abonnement actif.
 * - Inconnu        -> accessible (fail-open : jamais verrouiller par erreur).
 */
export function canAccess(feature: Feature | string, plan: Plan): boolean {
  if (isFreeForever(feature)) return true;
  if (isPremium(feature)) return plan === "active";
  return true; // fail-open : une feature non classée n'enferme jamais l'utilisateur
}

/** Résout le palier réel d'un utilisateur via le fournisseur de paiement. */
export async function getUserPlan(userId: string): Promise<Plan> {
  const status = await paymentProvider.getSubscriptionStatus(userId);
  return status === "active" ? "active" : "free";
}

/**
 * Accès effectif (résout le palier puis vérifie). Pour une feature gratuite à
 * vie, court-circuite sans interroger le fournisseur de paiement.
 */
export async function userCanAccess(
  userId: string,
  feature: Feature | string,
): Promise<boolean> {
  if (isFreeForever(feature) || !isPremium(feature)) return true;
  const plan = await getUserPlan(userId);
  return canAccess(feature, plan);
}
