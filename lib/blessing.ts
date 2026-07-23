import { Prisma } from "@prisma/client";
import type { Locale } from "@/lib/core-engine";
import { prisma } from "@/lib/db";
import { sendBlessingRequestEmail } from "@/lib/email";
import { env } from "@/lib/env";
import { accessibleConversationWhere } from "@/lib/blocks";
import { encryptField } from "@/lib/security/crypto";
import {
  BLESSING_DELIVERY_LEASE_MS,
  blessingTokenExpiresAt,
  generateBlessingToken,
  hashBlessingToken,
  isBlessingToken,
  statusForDecision,
} from "@/lib/sponsor";

const SERIALIZABLE_ATTEMPTS = 3;

type DeliverBlessingEmail = typeof sendBlessingRequestEmail;

export class BlessingMatchUnavailableError extends Error {
  readonly status = 404;

  constructor() {
    super("BLESSING_MATCH_UNAVAILABLE");
    this.name = "BlessingMatchUnavailableError";
  }
}

export class BlessingNotFoundError extends Error {
  readonly status = 404;

  constructor() {
    super("BLESSING_NOT_FOUND");
    this.name = "BlessingNotFoundError";
  }
}

export class BlessingSponsorMissingError extends Error {
  constructor() {
    super("BLESSING_SPONSOR_MISSING");
    this.name = "BlessingSponsorMissingError";
  }
}

export class BlessingDeliveryError extends Error {
  constructor() {
    super("BLESSING_EMAIL_DELIVERY_FAILED");
    this.name = "BlessingDeliveryError";
  }
}

export class BlessingDeliveryInProgressError extends Error {
  constructor() {
    super("BLESSING_EMAIL_DELIVERY_IN_PROGRESS");
    this.name = "BlessingDeliveryInProgressError";
  }
}

export class BlessingStateChangedError extends Error {
  constructor() {
    super("BLESSING_STATE_CHANGED");
    this.name = "BlessingStateChangedError";
  }
}

function prismaErrorCode(error: unknown): string | null {
  return error instanceof Prisma.PrismaClientKnownRequestError
    ? error.code
    : null;
}

/**
 * Transaction SERIALIZABLE avec rejeu borné des conflits PostgreSQL.
 * L'appelant doit garder l'opération idempotente à chaque tentative.
 */
export async function withSerializableRetry<T>(
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
  retryUniqueConflict = false,
): Promise<T> {
  for (let attempt = 1; attempt <= SERIALIZABLE_ATTEMPTS; attempt += 1) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      const code = prismaErrorCode(error);
      const retryable =
        code === "P2034" || (retryUniqueConflict && code === "P2002");
      if (retryable && attempt < SERIALIZABLE_ATTEMPTS) continue;
      throw error;
    }
  }

  throw new Error("SERIALIZABLE_RETRY_EXHAUSTED");
}

type IssueBlessingInput = {
  userId: string;
  displayName: string;
  locale: Locale;
  matchId: string;
  now?: Date;
  deliverEmail?: DeliverBlessingEmail;
};

type PendingIssue =
  | { kind: "already-delivered" }
  | { kind: "delivery-in-progress" }
  | {
      kind: "created";
      blessingId: string;
      sponsorId: string;
      sponsorEmail: string;
      sponsorName: string;
      token: string;
      tokenHash: string;
      expiresAt: Date;
    };

async function revokeUndeliveredBlessing(
  blessingId: string,
  tokenHash: string,
): Promise<void> {
  await prisma.blessing.deleteMany({
    where: {
      id: blessingId,
      tokenHash,
      status: "PENDING",
      emailSentAt: null,
    },
  });
}

/**
 * Émet au plus un lien PENDING pour (user, match).
 *
 * La création est sérialisable et protégée par l'index partiel de 0024. Le
 * bearer n'est gardé qu'en mémoire le temps de l'envoi. Tant que l'email n'est
 * pas confirmé, emailSentAt reste null et les routes publiques refusent le
 * lien : un crash ou un échec de révocation reste donc fail closed.
 */
export async function issueBlessingRequest({
  userId,
  displayName,
  locale,
  matchId,
  now = new Date(),
  deliverEmail = sendBlessingRequestEmail,
}: IssueBlessingInput): Promise<"created" | "already-pending"> {
  const staleDeliveryBefore = new Date(
    now.getTime() - BLESSING_DELIVERY_LEASE_MS,
  );

  const pending = await withSerializableRetry<PendingIssue>(async (tx) => {
    const match = await tx.match.findFirst({
      where: accessibleConversationWhere(matchId, userId),
      select: { id: true },
    });
    if (!match) throw new BlessingMatchUnavailableError();

    const sponsor = await tx.sponsor.findUnique({
      where: { userId },
      select: { id: true, email: true, name: true },
    });
    if (!sponsor) throw new BlessingSponsorMissingError();

    // Une émission abandonnée n'est jamais utilisable (emailSentAt null).
    // Le bail permet seulement de ne pas bloquer indéfiniment une réémission.
    await tx.blessing.deleteMany({
      where: {
        userId,
        matchId,
        status: "PENDING",
        OR: [
          { expiresAt: null },
          { expiresAt: { lte: now } },
          { tokenHash: null },
          { sponsorId: null },
          { sponsorId: { not: sponsor.id } },
          {
            emailSentAt: null,
            createdAt: { lte: staleDeliveryBefore },
          },
        ],
      },
    });

    const existing = await tx.blessing.findFirst({
      where: { userId, matchId, status: "PENDING" },
      select: { emailSentAt: true },
    });
    if (existing) {
      return existing.emailSentAt
        ? { kind: "already-delivered" }
        : { kind: "delivery-in-progress" };
    }

    const token = generateBlessingToken();
    const tokenHash = hashBlessingToken(token);
    const expiresAt = blessingTokenExpiresAt(now);
    const blessing = await tx.blessing.create({
      data: {
        sponsorId: sponsor.id,
        matchId,
        userId,
        tokenHash,
        expiresAt,
      },
      select: { id: true },
    });

    return {
      kind: "created",
      blessingId: blessing.id,
      sponsorId: sponsor.id,
      sponsorEmail: sponsor.email,
      sponsorName: sponsor.name,
      token,
      tokenHash,
      expiresAt,
    };
  }, true);

  if (pending.kind === "already-delivered") return "already-pending";
  if (pending.kind === "delivery-in-progress") {
    throw new BlessingDeliveryInProgressError();
  }

  const appUrl = env.APP_URL.replace(/\/+$/, "");
  const link = `${appUrl}/${locale}/parrain/${pending.token}`;
  let delivered = false;
  try {
    delivered = await deliverEmail(
      pending.sponsorEmail,
      pending.sponsorName,
      displayName,
      link,
      locale,
    );
  } catch {
    delivered = false;
  }

  if (!delivered) {
    // Même si cette suppression rencontre une panne, emailSentAt=null rend le
    // bearer inutilisable. La réponse reste un 502 explicite, jamais un succès.
    try {
      await revokeUndeliveredBlessing(pending.blessingId, pending.tokenHash);
    } catch {
      // Fail closed par emailSentAt=null ; ne jamais journaliser le bearer.
    }
    throw new BlessingDeliveryError();
  }

  const deliveredAt = new Date();
  const activated = await prisma.blessing.updateMany({
    where: {
      id: pending.blessingId,
      sponsorId: pending.sponsorId,
      tokenHash: pending.tokenHash,
      status: "PENDING",
      emailSentAt: null,
      expiresAt: { gt: deliveredAt },
      match: {
        is: accessibleConversationWhere(matchId, userId),
      },
    },
    data: { emailSentAt: deliveredAt },
  });

  if (activated.count !== 1) {
    try {
      await revokeUndeliveredBlessing(pending.blessingId, pending.tokenHash);
    } catch {
      // Le lien reste inutilisable tant que emailSentAt est null.
    }
    throw new BlessingStateChangedError();
  }

  return "created";
}

async function findTokenCandidate(token: string) {
  if (!isBlessingToken(token)) throw new BlessingNotFoundError();

  const tokenHash = hashBlessingToken(token);
  const candidate = await prisma.blessing.findUnique({
    where: { tokenHash },
    select: { id: true, matchId: true, userId: true },
  });
  if (!candidate) throw new BlessingNotFoundError();
  return { ...candidate, tokenHash };
}

/** Lecture publique minimale, uniquement pour un PENDING livré et valide. */
export async function getPendingBlessingView(
  token: string,
  now = new Date(),
): Promise<{ filleulName: string; status: "PENDING" }> {
  const candidate = await findTokenCandidate(token);
  const blessing = await prisma.blessing.findFirst({
    where: {
      id: candidate.id,
      tokenHash: candidate.tokenHash,
      status: "PENDING",
      emailSentAt: { not: null },
      expiresAt: { gt: now },
      match: {
        is: accessibleConversationWhere(candidate.matchId, candidate.userId),
      },
    },
    select: {
      user: { select: { displayName: true } },
    },
  });
  if (!blessing) throw new BlessingNotFoundError();

  return {
    filleulName: blessing.user.displayName,
    status: "PENDING",
  };
}

/** Réponse one-shot par CAS ; le hash est effacé dans la même écriture. */
export async function respondToBlessing(
  token: string,
  decision: "bless" | "caution",
  note: string | undefined,
  now = new Date(),
): Promise<void> {
  const candidate = await findTokenCandidate(token);
  const updated = await prisma.blessing.updateMany({
    where: {
      id: candidate.id,
      tokenHash: candidate.tokenHash,
      status: "PENDING",
      emailSentAt: { not: null },
      expiresAt: { gt: now },
      match: {
        is: accessibleConversationWhere(candidate.matchId, candidate.userId),
      },
    },
    data: {
      status: statusForDecision(decision),
      tokenHash: null,
      expiresAt: null,
      noteEncrypted: note ? encryptField(note) : null,
      respondedAt: now,
    },
  });

  if (updated.count !== 1) throw new BlessingStateChangedError();
}
