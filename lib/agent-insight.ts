import { encryptField, decryptField } from "./security/crypto";

/**
 * Chiffrement applicatif du champ AgentInsight.dataJson (signaux de vigilance,
 * résumés coach, portraits…) — données potentiellement sensibles stockées en
 * clair jusqu'ici (RGPD). On sérialise puis chiffre ; le ciphertext (une chaîne)
 * tient dans la colonne Json existante — aucune migration de schéma requise.
 *
 * Compat rétro : les lignes legacy sont des OBJETS JSON en clair. Toute valeur
 * de type string est donc un payload chiffré ; tout objet est du legacy renvoyé
 * tel quel.
 */

/** Sérialise + chiffre un objet pour stockage dans dataJson. */
export function sealInsight(data: unknown): string {
  return encryptField(JSON.stringify(data));
}

/** Déchiffre/parse une valeur dataJson. Tolère le legacy en clair et les valeurs invalides. */
export function openInsight<T = unknown>(stored: unknown): T | null {
  if (stored == null) return null;
  // Legacy : objet JSON stocké en clair avant le chiffrement.
  if (typeof stored === "object") return stored as T;
  if (typeof stored !== "string") return null;
  try {
    return JSON.parse(decryptField(stored)) as T;
  } catch {
    return null;
  }
}
