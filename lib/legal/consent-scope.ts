/**
 * Preuve serveur de la version des conditions acceptées à l'inscription.
 * La date correspond au champ `updated` des CGU dans `lib/legal/content.ts`.
 */
export const TERMS_OF_SERVICE_CONSENT = {
  type: "TERMS_OF_SERVICE",
  version: "terms-of-service:2026-07-23",
  purpose: "ACCEPTANCE_OF_TERMS_AND_CODE_OF_CONDUCT",
  recipient: "CHEMIN_ALLIANCE_CORE_SERVICE",
} as const;
