/**
 * Métadonnées d'erreur volontairement minimales pour les journaux serveur.
 *
 * Les objets d'erreur de Prisma, Stripe, Sharp ou d'un transport HTTP peuvent
 * contenir des requêtes, identifiants, corps de réponse ou autres données
 * personnelles. Ne jamais les passer directement à console.*.
 */
export type SafeErrorDetails = {
  errorName: string;
  errorCode?: string;
};

const SAFE_LABEL = /^[A-Za-z][A-Za-z0-9_.:-]{0,63}$/;

function safeLabel(value: unknown, fallback: string): string {
  if (typeof value !== "string" || !SAFE_LABEL.test(value)) return fallback;
  return value;
}

export function safeErrorDetails(error: unknown): SafeErrorDetails {
  if (typeof error !== "object" || error === null) {
    return { errorName: safeLabel(typeof error, "UnknownError") };
  }

  const candidate = error as { name?: unknown; code?: unknown };
  const errorName = safeLabel(candidate.name, "Error");
  const errorCode = safeLabel(candidate.code, "");

  return errorCode ? { errorName, errorCode } : { errorName };
}
