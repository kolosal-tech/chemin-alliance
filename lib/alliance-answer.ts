import { decryptField, encryptField } from "@/lib/security/crypto";

/**
 * Représentation persistée minimale d'une réponse Alliance.
 *
 * `answerLegacy` correspond à l'ancienne colonne SQL `answer`. Elle ne doit
 * être utilisée que pour lire les lignes antérieures à la migration 0022,
 * jusqu'à exécution du backfill applicatif.
 */
export type StoredAllianceAnswer = {
  answerEncrypted: string | null;
  answerLegacy: string;
};

export type ReadableAllianceAnswer = {
  questionId: string;
  userId: string;
  answer: string;
};

/** Prépare une écriture chiffrée et efface explicitement tout ancien clair. */
export function sealAllianceAnswer(answer: string): StoredAllianceAnswer {
  return {
    answerEncrypted: encryptField(answer),
    // Chaîne vide non sensible pour les anciennes instances dont le client
    // Prisma attend encore la colonne historique NOT NULL.
    answerLegacy: "",
  };
}

/**
 * Déchiffre une réponse pour un traitement serveur autorisé.
 *
 * Si un ciphertext existe mais a été altéré, l'erreur est propagée : on ne
 * retombe jamais sur le clair historique, afin de rester fail-closed.
 * Le fallback legacy est strictement limité aux lignes non encore backfillées.
 */
export function openAllianceAnswer(stored: StoredAllianceAnswer): string {
  if (stored.answerEncrypted) {
    return decryptField(stored.answerEncrypted);
  }
  if (stored.answerLegacy.length > 0) {
    return stored.answerLegacy;
  }
  throw new Error("Réponse Alliance absente");
}

export function toReadableAllianceAnswer(
  stored: StoredAllianceAnswer & { questionId: string; userId: string },
): ReadableAllianceAnswer {
  return {
    questionId: stored.questionId,
    userId: stored.userId,
    answer: openAllianceAnswer(stored),
  };
}
