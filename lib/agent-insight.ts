import { encryptField, decryptField } from "./security/crypto";

/**
 * Chiffrement applicatif du champ AgentInsight.dataJson (signaux de vigilance,
 * résumés coach, portraits…) - données potentiellement sensibles stockées en
 * clair jusqu'ici (RGPD). On sérialise puis chiffre ; le ciphertext (une chaîne)
 * tient dans la colonne Json existante - aucune migration de schéma requise.
 *
 * Compat rétro : les lignes legacy sont des OBJETS JSON en clair. Toute valeur
 * de type string est donc un payload chiffré ; tout objet est du legacy renvoyé
 * tel quel.
 */

/** Sérialise + chiffre un objet pour stockage dans dataJson. */
export function sealInsight(data: unknown): string {
  return encryptField(JSON.stringify(data));
}

/** Une valeur JSON non chaîne provient du stockage legacy en clair. */
export function isLegacyInsightValue(stored: unknown): boolean {
  return stored !== null && typeof stored === "object";
}

export class AgentInsightIntegrityError extends Error {
  constructor() {
    super("AgentInsight illisible");
    this.name = "AgentInsightIntegrityError";
  }
}

/**
 * Variante stricte pour les décisions de sécurité : une valeur absente,
 * malformée ou dont l'authentification AES-GCM échoue ne doit jamais être
 * interprétée comme une donnée rassurante.
 */
export function openInsightStrict<T = unknown>(stored: unknown): T {
  if (isLegacyInsightValue(stored)) return stored as T;
  if (typeof stored !== "string") throw new AgentInsightIntegrityError();
  try {
    return JSON.parse(decryptField(stored)) as T;
  } catch {
    throw new AgentInsightIntegrityError();
  }
}

/** Déchiffre/parse une valeur dataJson. Tolère le legacy en clair et les valeurs invalides. */
export function openInsight<T = unknown>(stored: unknown): T | null {
  if (stored == null) return null;
  // Legacy : objet JSON stocké en clair avant le chiffrement.
  if (isLegacyInsightValue(stored)) return stored as T;
  if (typeof stored !== "string") return null;
  try {
    return JSON.parse(decryptField(stored)) as T;
  } catch {
    return null;
  }
}
