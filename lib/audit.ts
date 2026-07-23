import { createHmac } from "node:crypto";

/**
 * Journal d'audit serveur minimal.
 *
 * La sortie est une ligne JSON sur stdout. Ce module ne garantit donc ni la
 * collecte, ni l'immutabilité, ni la durée de rétention des événements : ces
 * garanties appartiennent à la configuration de l'agrégateur de logs de
 * l'hébergeur. Aucun contenu métier, email, nom, jeton ou secret n'est accepté
 * par l'API ci-dessous.
 */

const ACCOUNT_EVENTS = [
  "password.change",
  "email.change",
  "notifications.enable",
  "notifications.disable",
] as const;

export type AuditEvent = (typeof ACCOUNT_EVENTS)[number];

const ADMIN_AUDIT_EVENT_ACTIONS = {
  "admin.reports.read": ["list", "page"],
  "admin.report.mutate": [
    "request",
    "reviewing",
    "resolved",
    "dismissed",
    "ban",
  ],
  "admin.coaches.read": ["list", "page"],
  "admin.coach.mutate": ["create", "delete"],
} as const;

export type AdminAuditEvent = keyof typeof ADMIN_AUDIT_EVENT_ACTIONS;
export type AdminAuditResult = "success" | "failure" | "denied" | "not_found";

type AdminAuditAction<E extends AdminAuditEvent> =
  (typeof ADMIN_AUDIT_EVENT_ACTIONS)[E][number];

export type AdminAuditInput<E extends AdminAuditEvent = AdminAuditEvent> = {
  event: E;
  action: AdminAuditAction<E>;
  result: AdminAuditResult;
  /** Identifiant interne brut, pseudonymisé avant toute écriture. */
  actorId: string;
  /** Identifiant interne brut de la ressource, pseudonymisé avant écriture. */
  targetId: string;
};

const ADMIN_RESULTS = [
  "success",
  "failure",
  "denied",
  "not_found",
] as const satisfies readonly AdminAuditResult[];

function auditKey(): string {
  const key = process.env.JWT_SECRET;
  if (!key || key.length < 32) {
    throw new Error("AUDIT_PSEUDONYM_KEY_UNAVAILABLE");
  }
  return key;
}

/** Pseudonyme stable, non réversible sans le secret serveur. */
export function auditPseudonym(rawId: string): string {
  if (!rawId || rawId.length > 256) {
    throw new TypeError("AUDIT_IDENTIFIER_INVALID");
  }
  return `psn_${createHmac("sha256", auditKey())
    .update(`chemin-alliance:audit:v1:${rawId}`, "utf8")
    .digest("hex")
    .slice(0, 32)}`;
}

function writeAudit(record: Record<string, string | number>): void {
  // Un seul point d'écriture, avec un objet déjà réduit à la liste blanche.
  console.info(JSON.stringify(record));
}

/**
 * Audit des quatre actions sensibles historiques. L'identifiant n'est plus
 * émis en clair et aucune métadonnée libre ne peut introduire de PII.
 */
export function audit(event: AuditEvent, userId: string): void {
  if (!(ACCOUNT_EVENTS as readonly string[]).includes(event)) {
    throw new TypeError("AUDIT_EVENT_INVALID");
  }
  writeAudit({
    schemaVersion: 1,
    tag: "audit",
    ts: new Date().toISOString(),
    event,
    actorId: auditPseudonym(userId),
    result: "success",
  });
}

/** Audit administratif à événement, action et résultat strictement bornés. */
export function auditAdmin<E extends AdminAuditEvent>(
  input: AdminAuditInput<E>,
): void {
  const allowedActions = ADMIN_AUDIT_EVENT_ACTIONS[
    input.event
  ] as readonly string[];
  if (!allowedActions?.includes(input.action)) {
    throw new TypeError("ADMIN_AUDIT_EVENT_OR_ACTION_INVALID");
  }
  if (!(ADMIN_RESULTS as readonly string[]).includes(input.result)) {
    throw new TypeError("ADMIN_AUDIT_RESULT_INVALID");
  }

  writeAudit({
    schemaVersion: 1,
    tag: "admin_audit",
    ts: new Date().toISOString(),
    event: input.event,
    action: input.action,
    result: input.result,
    actorId: auditPseudonym(input.actorId),
    targetId: auditPseudonym(input.targetId),
  });
}
