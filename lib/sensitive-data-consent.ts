import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { revokeAiCoachConsent } from "@/lib/ai-coach/consent";
import { SENSITIVE_DATA_CONSENT } from "@/lib/sensitive-data-consent-scope";

export { SENSITIVE_DATA_CONSENT } from "@/lib/sensitive-data-consent-scope";

const DEPENDENT_CONSENT_TYPES = [
  "SENSITIVE_DATA_PROCESSING",
  "COUPLE_COACH_SHARING",
  "CONTACT_EXCHANGE",
  "AGENT_PROFILING",
] as const;

const TRANSACTION_OPTIONS = {
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  maxWait: 5_000,
  timeout: 10_000,
} as const;
const REVOCATION_BARRIER_PURPOSE =
  "SENSITIVE_DATA_PROCESSING_REVOCATION_BARRIER";

export class SensitiveDataConsentSupersededError extends Error {
  constructor() {
    super("SENSITIVE_DATA_CONSENT_OPERATION_SUPERSEDED");
    this.name = "SensitiveDataConsentSupersededError";
  }
}

function isWriteConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  );
}

async function serializable<T>(
  work: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await prisma.$transaction(work, TRANSACTION_OPTIONS);
    } catch (error) {
      if (isWriteConflict(error) && attempt < maxAttempts) continue;
      throw error;
    }
  }
  throw new Error("SENSITIVE_DATA_CONSENT_TRANSACTION_EXHAUSTED");
}

async function acquireLock(
  tx: Prisma.TransactionClient,
  userId: string,
): Promise<void> {
  await tx.$queryRaw<Array<{ locked: boolean }>>(
    Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${`sensitive-data-consent:${userId}`}, 0)) IS NULL AS "locked"`,
  );
}

async function databaseClock(tx: Prisma.TransactionClient): Promise<Date> {
  const rows = await tx.$queryRaw<Array<{ now: Date }>>(
    Prisma.sql`SELECT clock_timestamp() AS "now"`,
  );
  const now = rows[0]?.now;
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new Error("SENSITIVE_DATA_CONSENT_DATABASE_CLOCK_UNAVAILABLE");
  }
  return now;
}

export const activeSensitiveDataConsentWhere = (userId: string) =>
  ({
    userId,
    type: SENSITIVE_DATA_CONSENT.type,
    revokedAt: null,
  }) as const;

export const activeSensitiveDataConsentUserWhere = {
  consents: {
    some: {
      type: SENSITIVE_DATA_CONSENT.type,
      revokedAt: null,
    },
  },
} satisfies Prisma.UserWhereInput;

/** Filtre bilatéral : aucune relation ne traite le profil d'un membre retiré. */
export const activeSensitiveDataConsentPairWhere = {
  userA: { is: activeSensitiveDataConsentUserWhere },
  userB: { is: activeSensitiveDataConsentUserWhere },
} satisfies Prisma.MatchWhereInput;

/** Espace couple : le membre B peut être absent pendant l'invitation. */
export function consentingCoupleSpaceMemberWhere(
  userId: string,
): Prisma.CoupleSpaceWhereInput {
  return {
    AND: [
      { OR: [{ userAId: userId }, { userBId: userId }] },
      { userA: { is: activeSensitiveDataConsentUserWhere } },
      {
        OR: [
          { userBId: null },
          { userB: { is: activeSensitiveDataConsentUserWhere } },
        ],
      },
    ],
  };
}

export async function getSensitiveDataConsentState(userId: string) {
  const consent = await prisma.consent.findFirst({
    where: activeSensitiveDataConsentWhere(userId),
    select: { id: true, grantedAt: true, version: true },
    orderBy: { grantedAt: "desc" },
  });
  return {
    active: consent !== null,
    grantedAt: consent?.grantedAt ?? null,
    version: consent?.version ?? SENSITIVE_DATA_CONSENT.version,
  };
}

export async function grantSensitiveDataConsent(userId: string) {
  return serializable(async (tx) => {
    const operationStartedAt = await databaseClock(tx);
    await acquireLock(tx, userId);
    const existing = await tx.consent.findFirst({
      where: activeSensitiveDataConsentWhere(userId),
      select: { id: true, grantedAt: true, version: true },
      orderBy: { grantedAt: "desc" },
    });
    if (existing) return existing;

    const laterRevocation = await tx.consent.findFirst({
      where: {
        userId,
        type: SENSITIVE_DATA_CONSENT.type,
        revokedAt: { gte: operationStartedAt },
      },
      select: { revokedAt: true },
      orderBy: { revokedAt: "desc" },
    });
    if (laterRevocation?.revokedAt) {
      throw new SensitiveDataConsentSupersededError();
    }

    const now = await databaseClock(tx);
    const consent = await tx.consent.create({
      data: {
        userId,
        ...SENSITIVE_DATA_CONSENT,
        grantedAt: now,
      },
      select: { id: true, grantedAt: true, version: true },
    });
    await tx.privacySettings.upsert({
      where: { userId },
      create: { userId, invisibleMode: false },
      update: { invisibleMode: false },
    });
    return consent;
  });
}

/**
 * Le retrait bloque d'abord le traitement général et masque le profil. Le
 * retrait Coach IA attend ensuite les transferts déjà admis avant de répondre.
 */
export async function revokeSensitiveDataConsent(
  userId: string,
): Promise<Date> {
  const revokedAt = await serializable(async (tx) => {
    await acquireLock(tx, userId);
    const now = await databaseClock(tx);
    await tx.consent.updateMany({
      where: {
        userId,
        type: { in: [...DEPENDENT_CONSENT_TYPES] },
        revokedAt: null,
      },
      data: { revokedAt: now },
    });
    const barrier = await tx.consent.findFirst({
      where: {
        userId,
        type: SENSITIVE_DATA_CONSENT.type,
        purpose: REVOCATION_BARRIER_PURPOSE,
      },
      select: { id: true },
      orderBy: { grantedAt: "desc" },
    });
    if (barrier) {
      await tx.consent.update({
        where: { id: barrier.id },
        data: {
          version: SENSITIVE_DATA_CONSENT.version,
          recipient: SENSITIVE_DATA_CONSENT.recipient,
          revokedAt: now,
        },
      });
    } else {
      await tx.consent.create({
        data: {
          userId,
          type: SENSITIVE_DATA_CONSENT.type,
          version: SENSITIVE_DATA_CONSENT.version,
          purpose: REVOCATION_BARRIER_PURPOSE,
          recipient: SENSITIVE_DATA_CONSENT.recipient,
          grantedAt: now,
          revokedAt: now,
        },
      });
    }
    await tx.privacySettings.upsert({
      where: { userId },
      create: { userId, invisibleMode: true },
      update: { invisibleMode: true },
    });
    return now;
  });

  await revokeAiCoachConsent(userId);
  return revokedAt;
}
