/**
 * Logique PURE des jobs de rétention (cron). Aucun accès DB, aucune date
 * implicite (`now` injecté) : entièrement testable et rejouable.
 */

type PurgePlan = {
  /** Supprimer les vérifications téléphone expirées avant cette date. */
  phoneBefore: Date;
  /** Nullifier les tokens email/MDP expirés avant cette date. */
  tokenBefore: Date;
  /** Supprimer les compteurs Coach IA antérieurs à cette date (~90 j). */
  aiCoachBefore: Date;
  /** Supprimer les baux techniques Coach IA déjà expirés. */
  aiCoachTransferBefore: Date;
  /** Supprimer les signalements ayant atteint la rétention annoncée (12 mois). */
  reportBefore: Date;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** Bornes de purge déterministes à partir de `now`. */
export function buildPurgePlan(now: Date): PurgePlan {
  return {
    phoneBefore: now,
    tokenBefore: now,
    aiCoachBefore: new Date(now.getTime() - 90 * DAY_MS),
    aiCoachTransferBefore: now,
    reportBefore: new Date(now.getTime() - 365 * DAY_MS),
  };
}

/** Dédoublonne les userId à notifier (un user multi-devices = un seul envoi). */
export function usersDueForDailyDevotion(userIds: string[]): string[] {
  return [...new Set(userIds)];
}

/** Découpe un tableau en lots de taille `size` (borne la charge d'un cron). */
export function chunk<T>(arr: T[], size: number): T[][] {
  if (size <= 0) return [arr];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
