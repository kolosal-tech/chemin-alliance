import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { DAILY_FREE_LIMIT } from "@/lib/ai-coach";
import { assertLlmDeadlineActive } from "@/lib/llm/deadline";
import { currentAiRecipientScope } from "@/lib/llm/scope";
import { safeErrorDetails } from "@/lib/security/safe-error";

/**
 * Périmètre canonique du consentement au Coach IA interactif.
 *
 * Toute modification substantielle du texte, de la finalité, des catégories
 * de données ou des destinataires doit changer `version`. Les anciennes lignes
 * échouent alors fermées jusqu'à un nouveau consentement explicite.
 */
export const AI_COACH_CONSENT = Object.freeze({
  type: "AI_COACH_INTERACTION" as const,
  version: "ai-coach-interactive-2026-07-23.v3",
  purpose: "INTERACTIVE_DISCERNMENT_SUPPORT",
  get recipient(): string {
    return currentAiRecipientScope().fingerprint;
  },
});

const AI_COACH_LOCK_NAMESPACE = "chemin-alliance:ai-coach-consent:v1";
const REVOCATION_BARRIER_PURPOSE = "AI_COACH_REVOCATION_BARRIER";
export const AI_COACH_TRANSFER_LEASE_MS = 20_000;
const TRANSFER_WAIT_INITIAL_POLL_MS = 25;
const TRANSFER_WAIT_MAX_POLL_MS = 250;
const TRANSACTION_OPTIONS = Object.freeze({
  maxWait: 5_000,
  timeout: 25_000,
  isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
});

export type AiCoachConsentRecord = {
  id: string;
  type: string;
  version: string | null;
  purpose: string | null;
  recipient: string | null;
  grantedAt: Date;
  revokedAt: Date | null;
};

const consentSelect = {
  id: true,
  type: true,
  version: true,
  purpose: true,
  recipient: true,
  grantedAt: true,
  revokedAt: true,
} as const;

export class AiCoachConsentRequiredError extends Error {
  constructor() {
    super("AI_COACH_CONSENT_REQUIRED");
    this.name = "AiCoachConsentRequiredError";
  }
}

export class AiCoachConsentSupersededError extends Error {
  constructor() {
    super("AI_COACH_CONSENT_OPERATION_SUPERSEDED");
    this.name = "AiCoachConsentSupersededError";
  }
}

export class AiCoachQuotaExceededError extends Error {
  constructor() {
    super("AI_COACH_DAILY_QUOTA_EXCEEDED");
    this.name = "AiCoachQuotaExceededError";
  }
}

export type AiCoachTransferAdmission = Readonly<{
  leaseId: string;
  remaining: number | null;
}>;

function exactConsentDimensions() {
  const recipient = currentAiRecipientScope().fingerprint;
  return {
    type: AI_COACH_CONSENT.type,
    version: AI_COACH_CONSENT.version,
    purpose: AI_COACH_CONSENT.purpose,
    recipient,
  } as const;
}

function lockScope(userId: string): string {
  return `${AI_COACH_LOCK_NAMESPACE}:${AI_COACH_CONSENT.type}:${userId}`;
}

/** Verrou partagé par grant, revoke et départ fournisseur. */
export async function acquireAiCoachConsentLock(
  tx: Prisma.TransactionClient,
  userId: string,
): Promise<void> {
  await tx.$queryRaw<Array<{ acquired: boolean }>>(
    Prisma.sql`
      SELECT pg_advisory_xact_lock(
        hashtextextended(${lockScope(userId)}, 0)
      ) IS NULL AS "acquired"
    `,
  );
}

async function databaseClock(tx: Prisma.TransactionClient): Promise<Date> {
  const rows = await tx.$queryRaw<Array<{ now: Date }>>(
    Prisma.sql`SELECT clock_timestamp() AS "now"`,
  );
  const now = rows[0]?.now;
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new Error("AI_COACH_DATABASE_CLOCK_UNAVAILABLE");
  }
  return now;
}

/** Filtre exact utilisé par toutes les autorisations serveur du Coach IA. */
export function activeAiCoachConsentWhere(userId: string) {
  return {
    userId,
    ...exactConsentDimensions(),
    revokedAt: null,
  } as const;
}

/**
 * Vérification pure utile aux frontières de confiance et aux tests.
 * Une ligne générique, ancienne, incomplète ou révoquée n'autorise rien.
 */
export function isExactActiveAiCoachConsent(
  consent: AiCoachConsentRecord | null | undefined,
): consent is AiCoachConsentRecord {
  const expected = exactConsentDimensions();
  return Boolean(
    consent &&
    consent.type === expected.type &&
    consent.version === expected.version &&
    consent.purpose === expected.purpose &&
    consent.recipient === expected.recipient &&
    consent.revokedAt === null,
  );
}

export async function getActiveAiCoachConsent(
  userId: string,
): Promise<AiCoachConsentRecord | null> {
  const consent = await prisma.consent.findFirst({
    where: activeAiCoachConsentWhere(userId),
    select: consentSelect,
    orderBy: { grantedAt: "desc" },
  });
  return isExactActiveAiCoachConsent(consent) ? consent : null;
}

/**
 * Recueil idempotent, entièrement côté serveur : le client ne choisit ni la
 * version, ni la finalité, ni le destinataire et n'envoie aucun contenu Coach.
 */
export async function grantAiCoachConsent(
  userId: string,
): Promise<AiCoachConsentRecord> {
  try {
    return await prisma.$transaction(async (tx) => {
      // Horodatage d'admission AVANT l'attente du verrou. Si un retrait qui
      // chevauche ce POST passe en premier, son tombstone sera plus récent et
      // ce POST ne pourra pas réactiver le consentement en sortant de l'attente.
      const operationStartedAt = await databaseClock(tx);
      await acquireAiCoachConsentLock(tx, userId);

      const existing = await tx.consent.findFirst({
        where: activeAiCoachConsentWhere(userId),
        select: consentSelect,
        orderBy: { grantedAt: "desc" },
      });
      if (isExactActiveAiCoachConsent(existing)) return existing;

      const laterRevocation = await tx.consent.findFirst({
        where: {
          userId,
          type: AI_COACH_CONSENT.type,
          revokedAt: { gte: operationStartedAt },
        },
        select: { revokedAt: true },
        orderBy: { revokedAt: "desc" },
      });
      if (laterRevocation?.revokedAt) {
        throw new AiCoachConsentSupersededError();
      }

      const now = await databaseClock(tx);
      // Une ancienne version ne doit jamais rester présentée comme active après
      // le recueil de la version courante.
      await tx.consent.updateMany({
        where: {
          userId,
          type: AI_COACH_CONSENT.type,
          revokedAt: null,
        },
        data: { revokedAt: now },
      });

      return tx.consent.create({
        data: {
          userId,
          ...exactConsentDimensions(),
          grantedAt: now,
        },
        select: consentSelect,
      });
    }, TRANSACTION_OPTIONS);
  } catch (error) {
    // Deux onglets peuvent consentir au même instant. L'index partiel tranche ;
    // le perdant relit la ligne gagnante pour conserver une API idempotente.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const existing = await getActiveAiCoachConsent(userId);
      if (existing) return existing;
    }
    throw error;
  }
}

type RevocationResult = {
  revokedAt: Date;
  admittedLeaseIds: string[];
};

async function waitForAdmittedTransfers(
  admittedLeaseIds: readonly string[],
): Promise<void> {
  if (admittedLeaseIds.length === 0) return;

  let pollMs = TRANSFER_WAIT_INITIAL_POLL_MS;
  while (true) {
    const [clockRows, leases] = await prisma.$transaction([
      prisma.$queryRaw<Array<{ now: Date }>>(
        Prisma.sql`SELECT clock_timestamp() AS "now"`,
      ),
      prisma.aiCoachTransferLease.findMany({
        where: { id: { in: [...admittedLeaseIds] } },
        select: { id: true, expiresAt: true },
      }),
    ]);
    const now = clockRows[0]?.now;
    if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
      throw new Error("AI_COACH_DATABASE_CLOCK_UNAVAILABLE");
    }

    const active = leases.filter(
      (lease) => lease.expiresAt.getTime() > now.getTime(),
    );
    if (active.length === 0) {
      // Nettoyage idempotent des baux expirés laissés par un processus tombé.
      await prisma.aiCoachTransferLease.deleteMany({
        where: { id: { in: [...admittedLeaseIds] } },
      });
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, pollMs));
    pollMs = Math.min(pollMs * 2, TRANSFER_WAIT_MAX_POLL_MS);
  }
}

/** Retire toutes les versions actives puis attend les transferts déjà admis. */
export async function revokeAiCoachConsent(userId: string): Promise<Date> {
  const result = await prisma.$transaction<RevocationResult>(async (tx) => {
    await acquireAiCoachConsentLock(tx, userId);
    const revokedAt = await databaseClock(tx);

    await tx.consent.updateMany({
      where: {
        userId,
        type: AI_COACH_CONSENT.type,
        revokedAt: null,
      },
      data: { revokedAt },
    });

    // Une unique barrière par membre rend le retrait observable même sans ligne
    // active. Elle est rafraîchie, jamais multipliée : DELETE reste disponible
    // sans dépendre de Redis et ne peut pas faire croître Consent sans borne.
    const barrier = await tx.consent.findFirst({
      where: {
        userId,
        type: AI_COACH_CONSENT.type,
        purpose: REVOCATION_BARRIER_PURPOSE,
      },
      select: { id: true },
      orderBy: { grantedAt: "desc" },
    });
    const dimensions = exactConsentDimensions();
    if (barrier) {
      await tx.consent.update({
        where: { id: barrier.id },
        data: {
          version: dimensions.version,
          recipient: dimensions.recipient,
          revokedAt,
        },
        select: { id: true },
      });
    } else {
      await tx.consent.create({
        data: {
          userId,
          type: dimensions.type,
          version: dimensions.version,
          purpose: REVOCATION_BARRIER_PURPOSE,
          recipient: dimensions.recipient,
          grantedAt: revokedAt,
          revokedAt,
        },
        select: { id: true },
      });
    }

    // L'admission d'un transfert et le retrait partagent le même verrou. Toute
    // ligne visible ici a donc été admise avant ce retrait ; une admission qui
    // passe après relira nécessairement le consentement révoqué et échouera.
    const admittedLeases = await tx.aiCoachTransferLease.findMany({
      where: {
        userId,
        admittedAt: { lte: revokedAt },
        expiresAt: { gt: revokedAt },
      },
      select: { id: true },
    });
    return {
      revokedAt,
      admittedLeaseIds: admittedLeases.map((lease) => lease.id),
    };
  }, TRANSACTION_OPTIONS);

  // Attente volontairement HORS transaction : aucune connexion PostgreSQL ni
  // verrou n'est immobilisé pendant l'appel fournisseur. Un processus tombé
  // ne bloque le retrait que jusqu'à l'expiration bornée de son bail.
  await waitForAdmittedTransfers(result.admittedLeaseIds);
  return result.revokedAt;
}

export function aiCoachConsentDto(consent: AiCoachConsentRecord | null): {
  active: boolean;
  type: typeof AI_COACH_CONSENT.type;
  version: string;
  purpose: string;
  recipient: string;
  recipientSummary: string;
  grantedAt: string | null;
} {
  const scope = currentAiRecipientScope();
  const active = isExactActiveAiCoachConsent(consent);
  return {
    active,
    ...exactConsentDimensions(),
    recipientSummary: scope.summary,
    grantedAt: active ? consent.grantedAt.toISOString() : null,
  };
}

/**
 * Vérification sous verrou réservée aux opérations DB courtes.
 *
 * Ne jamais appeler un fournisseur dans ce callback : le chemin réseau utilise
 * `withAdmittedAiCoachTransfer`, qui libère la transaction avant le callback.
 */
export async function withActiveAiCoachConsent<T>(
  userId: string,
  callback: (
    tx: Prisma.TransactionClient,
    consent: AiCoachConsentRecord,
  ) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await acquireAiCoachConsentLock(tx, userId);
    const consent = await tx.consent.findFirst({
      where: activeAiCoachConsentWhere(userId),
      select: consentSelect,
      orderBy: { grantedAt: "desc" },
    });
    if (!isExactActiveAiCoachConsent(consent)) {
      throw new AiCoachConsentRequiredError();
    }
    return callback(tx, consent);
  }, TRANSACTION_OPTIONS);
}

async function admitAiCoachTransfer(
  userId: string,
  isPremium: boolean,
): Promise<AiCoachTransferAdmission> {
  return prisma.$transaction(async (tx) => {
    await acquireAiCoachConsentLock(tx, userId);
    // L'échéance démarre avant l'ouverture de cette transaction. Une requête
    // ayant épuisé son budget en attendant le verrou ne réserve ni quota ni bail.
    assertLlmDeadlineActive();

    const consent = await tx.consent.findFirst({
      where: activeAiCoachConsentWhere(userId),
      select: consentSelect,
      orderBy: { grantedAt: "desc" },
    });
    if (!isExactActiveAiCoachConsent(consent)) {
      throw new AiCoachConsentRequiredError();
    }

    const admittedAt = await databaseClock(tx);
    await tx.aiCoachTransferLease.deleteMany({
      where: { userId, expiresAt: { lte: admittedAt } },
    });

    let remaining: number | null = null;
    if (!isPremium) {
      const day = new Date(admittedAt);
      day.setUTCHours(0, 0, 0, 0);
      const usage = await tx.aiCoachUsage.upsert({
        where: { userId_day: { userId, day } },
        create: { userId, day, count: 1 },
        update: { count: { increment: 1 } },
      });
      if (usage.count > DAILY_FREE_LIMIT) {
        // L'exception rollbacke uniquement cette courte réservation. Un appel
        // fournisseur déjà admis n'est jamais remboursé après un timeout.
        throw new AiCoachQuotaExceededError();
      }
      remaining = Math.max(0, DAILY_FREE_LIMIT - usage.count);
    }

    const leaseId = randomUUID();
    await tx.aiCoachTransferLease.create({
      data: {
        id: leaseId,
        userId,
        consentId: consent.id,
        admittedAt,
        expiresAt: new Date(admittedAt.getTime() + AI_COACH_TRANSFER_LEASE_MS),
      },
      select: { id: true },
    });
    return { leaseId, remaining };
  }, TRANSACTION_OPTIONS);
}

async function completeAiCoachTransfer(leaseId: string): Promise<void> {
  try {
    await prisma.aiCoachTransferLease.deleteMany({ where: { id: leaseId } });
  } catch (error) {
    // Le bail expire de lui-même et le retrait reste borné. Une panne de
    // nettoyage après persistance de la réponse ne transforme pas un succès
    // utilisateur en erreur 500.
    console.error(
      "[ai-coach] impossible de clôturer immédiatement le bail de transfert",
      safeErrorDetails(error),
    );
  }
}

/**
 * Admet atomiquement consentement + quota, puis exécute le réseau hors DB.
 *
 * Le bail court rend le transfert visible au retrait sans garder une connexion
 * ni un advisory lock pendant le réseau. `DELETE` attend les seuls baux admis
 * avant sa linéarisation, jusqu'à clôture effective ou expiration bornée.
 */
export async function withAdmittedAiCoachTransfer<T>(
  userId: string,
  isPremium: boolean,
  callback: (admission: AiCoachTransferAdmission) => Promise<T>,
): Promise<T> {
  const admission = await admitAiCoachTransfer(userId, isPremium);
  try {
    assertLlmDeadlineActive();
    return await callback(admission);
  } finally {
    await completeAiCoachTransfer(admission.leaseId);
  }
}
