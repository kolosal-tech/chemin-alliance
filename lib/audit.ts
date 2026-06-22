/**
 * Journal d'audit interne (support & sécurité).
 *
 * Émis CÔTÉ SERVEUR uniquement, jamais affiché dans l'UI. Volontairement
 * minimal : un événement, l'utilisateur concerné, un horodatage ISO et des
 * métadonnées NON sensibles. On ne journalise JAMAIS de secret (mot de passe,
 * jeton) ni de PII en clair (adresse email, contenu de message) - seulement
 * de quoi répondre à « qui a fait quelle action sensible, et quand ».
 *
 * Sortie = une ligne JSON sur stdout (greppable, parsable), récupérée par
 * l'agrégateur de logs de l'hébergeur (Vercel). Aucune dépendance, aucune
 * écriture en base : si l'on veut persister plus tard, ce point de passage
 * unique suffit à le faire.
 */
type AuditMeta = Record<string, string | number | boolean | null>;

/** Événements suivis (liste fermée pour rester cohérent côté support). */
export type AuditEvent =
  | "password.change"
  | "email.change"
  | "notifications.enable"
  | "notifications.disable";

export function audit(
  event: AuditEvent,
  userId: string,
  meta: AuditMeta = {},
): void {
  console.log(
    JSON.stringify({
      tag: "audit",
      ts: new Date().toISOString(),
      event,
      userId,
      ...meta,
    }),
  );
}
