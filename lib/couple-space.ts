import { createHmac } from "node:crypto";
import { LifeSeason, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { generateInviteCode } from "@/lib/agents/guardian";
import {
  activeSensitiveDataConsentPairWhere,
  activeSensitiveDataConsentUserWhere,
  consentingCoupleSpaceMemberWhere,
} from "@/lib/sensitive-data-consent";

export const COUPLE_INVITE_TTL_MS = 72 * 60 * 60 * 1000;

export type CoupleSpaceErrorCode =
  | "CODE_INVALID"
  | "EMAIL_NOT_VERIFIED"
  | "INVALID_TRANSITION"
  | "NO_PENDING_INVITE"
  | "NO_PENDING_SPACE"
  | "NO_SPACE"
  | "NOT_ELIGIBLE"
  | "NOT_FOUND"
  | "SEASON_MISMATCH"
  | "SEASON_REQUEST_CONFLICT"
  | "SPACE_EXISTS"
  | "STAGE_NOT_ELIGIBLE";

const ERROR_STATUS: Record<CoupleSpaceErrorCode, number> = {
  CODE_INVALID: 404,
  EMAIL_NOT_VERIFIED: 403,
  INVALID_TRANSITION: 409,
  NO_PENDING_INVITE: 409,
  NO_PENDING_SPACE: 404,
  NO_SPACE: 404,
  NOT_ELIGIBLE: 409,
  NOT_FOUND: 404,
  SEASON_MISMATCH: 409,
  SEASON_REQUEST_CONFLICT: 409,
  SPACE_EXISTS: 409,
  STAGE_NOT_ELIGIBLE: 409,
};

export class CoupleSpaceError extends Error {
  readonly status: number;

  constructor(readonly code: CoupleSpaceErrorCode) {
    super(code);
    this.name = "CoupleSpaceError";
    this.status = ERROR_STATUS[code];
  }
}

function hmac(domain: string, value: string): string {
  return createHmac("sha256", env.JWT_SECRET)
    .update(`${domain}\0${value}`)
    .digest("hex");
}

export function normalizeInviteCode(code: string): string {
  return code.trim().toUpperCase();
}

export function normalizeInviteEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function hashCoupleInviteCode(code: string): string {
  return hmac("couple-invite-code:v1", normalizeInviteCode(code));
}

export function hashCoupleInviteEmail(email: string): string {
  return hmac("couple-invite-email:v1", normalizeInviteEmail(email));
}

export function canonicalCouplePairKey(
  firstUserId: string,
  secondUserId: string,
): string {
  if (firstUserId === secondUserId) {
    throw new CoupleSpaceError("NOT_ELIGIBLE");
  }
  return [firstUserId, secondUserId].sort().join(":");
}

export function expectedNextCoupleSeason(
  season: LifeSeason,
): "MARRIED" | "PARENTS" | null {
  if (season === "ENGAGED") return "MARRIED";
  if (season === "MARRIED") return "PARENTS";
  return null;
}

function isPrismaError(error: unknown, code: string): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === code
  );
}

async function serializable<T>(
  work: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await prisma.$transaction(work, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (isPrismaError(error, "P2034") && attempt < maxAttempts) continue;
      throw error;
    }
  }
  throw new Error("COUPLE_SPACE_TRANSACTION_EXHAUSTED");
}

function memberFilter(userId: string): Prisma.CoupleSpaceWhereInput {
  return { OR: [{ userAId: userId }, { userBId: userId }] };
}

async function setMembersSeason(
  tx: Prisma.TransactionClient,
  userAId: string,
  userBId: string,
  season: "ENGAGED" | "MARRIED" | "PARENTS",
): Promise<void> {
  const maritalStatus = season === "ENGAGED" ? "engaged" : "married";
  await tx.user.updateMany({
    where: { id: { in: [userAId, userBId] }, deletedAt: null },
    data: { season },
  });
  await Promise.all(
    [userAId, userBId].map((userId) =>
      tx.relationshipProfile.upsert({
        where: { userId },
        create: { userId, maritalStatus },
        update: { maritalStatus },
      }),
    ),
  );
}

export async function createMatchCoupleSpace(
  actorId: string,
  matchId: string,
): Promise<{ spaceId: string; pendingPartner: boolean }> {
  try {
    return await serializable(async (tx) => {
      const match = await tx.match.findFirst({
        where: { id: matchId, ...activeSensitiveDataConsentPairWhere },
        select: {
          id: true,
          userAId: true,
          userBId: true,
          status: true,
          stage: true,
        },
      });
      if (!match || (match.userAId !== actorId && match.userBId !== actorId)) {
        throw new CoupleSpaceError("NOT_FOUND");
      }

      const existingForMatch = await tx.coupleSpace.findUnique({
        where: { matchId },
        select: { id: true, userAId: true, userBId: true, status: true },
      });
      if (existingForMatch) {
        if (
          !existingForMatch.userBId ||
          canonicalCouplePairKey(
            existingForMatch.userAId,
            existingForMatch.userBId,
          ) !== canonicalCouplePairKey(match.userAId, match.userBId)
        ) {
          throw new CoupleSpaceError("NOT_FOUND");
        }
        return {
          spaceId: existingForMatch.id,
          pendingPartner: existingForMatch.status === "PENDING",
        };
      }

      if (match.status !== "ACTIVE") {
        throw new CoupleSpaceError("NOT_FOUND");
      }
      if (!["COMMITMENT", "MARRIAGE_PREPARATION"].includes(match.stage)) {
        throw new CoupleSpaceError("STAGE_NOT_ELIGIBLE");
      }

      const otherId = match.userAId === actorId ? match.userBId : match.userAId;
      const occupied = await tx.coupleSpace.findFirst({
        where: {
          OR: [
            { userAId: actorId },
            { userBId: actorId },
            { userAId: otherId },
            { userBId: otherId },
          ],
        },
        select: { id: true },
      });
      if (occupied) throw new CoupleSpaceError("SPACE_EXISTS");

      const created = await tx.coupleSpace.create({
        data: {
          userAId: actorId,
          userBId: otherId,
          pairKey: canonicalCouplePairKey(actorId, otherId),
          status: "PENDING",
          origin: "MATCH",
          matchId,
          inviteCode: null,
        },
        select: { id: true },
      });
      return { spaceId: created.id, pendingPartner: true };
    });
  } catch (error) {
    if (isPrismaError(error, "P2002")) {
      const existing = await prisma.coupleSpace.findUnique({
        where: { matchId },
        select: { id: true, status: true },
      });
      if (existing) {
        return {
          spaceId: existing.id,
          pendingPartner: existing.status === "PENDING",
        };
      }
      throw new CoupleSpaceError("SPACE_EXISTS");
    }
    // Le trigger d'appartenance utilise SQLSTATE 23514, remonté par Prisma
    // comme contrainte échouée. On ne divulgue jamais quel membre est occupé.
    if (isPrismaError(error, "P2004")) {
      throw new CoupleSpaceError("SPACE_EXISTS");
    }
    throw error;
  }
}

export async function createExternalCoupleSpace(
  actorId: string,
): Promise<{ spaceId: string }> {
  try {
    return await serializable(async (tx) => {
      const actor = await tx.user.findFirst({
        where: {
          id: actorId,
          deletedAt: null,
          ...activeSensitiveDataConsentUserWhere,
        },
        select: { season: true },
      });
      if (
        !actor ||
        (actor.season !== "ENGAGED" && actor.season !== "MARRIED")
      ) {
        throw new CoupleSpaceError("NOT_ELIGIBLE");
      }
      const occupied = await tx.coupleSpace.findFirst({
        where: memberFilter(actorId),
        select: { id: true },
      });
      if (occupied) throw new CoupleSpaceError("SPACE_EXISTS");

      const engaged = actor.season === "ENGAGED";
      const created = await tx.coupleSpace.create({
        data: {
          userAId: actorId,
          origin: engaged ? "ENGAGED" : "EXTERNAL",
          season: engaged ? "ENGAGED" : "MARRIED",
          inviteCode: null,
          marriedAt: engaged ? null : new Date(),
        },
        select: { id: true },
      });
      return { spaceId: created.id };
    });
  } catch (error) {
    if (isPrismaError(error, "P2002") || isPrismaError(error, "P2004")) {
      throw new CoupleSpaceError("SPACE_EXISTS");
    }
    throw error;
  }
}

export type IssuedCoupleInvite = {
  code: string;
  codeHash: string;
  expiresAt: Date;
  spaceId: string;
};

export async function issueCoupleInvite(
  actorId: string,
  recipientEmail: string,
  now = new Date(),
): Promise<IssuedCoupleInvite> {
  const code = generateInviteCode();
  const codeHash = hashCoupleInviteCode(code);
  const emailHash = hashCoupleInviteEmail(recipientEmail);
  const expiresAt = new Date(now.getTime() + COUPLE_INVITE_TTL_MS);

  return serializable(async (tx) => {
    const space = await tx.coupleSpace.findFirst({
      where: {
        userAId: actorId,
        userBId: null,
        status: "PENDING",
      },
      select: { id: true },
    });
    if (!space) throw new CoupleSpaceError("NO_PENDING_INVITE");

    const updated = await tx.coupleSpace.updateMany({
      where: {
        id: space.id,
        userAId: actorId,
        userBId: null,
        status: "PENDING",
      },
      data: {
        inviteCode: null,
        inviteCodeHash: codeHash,
        inviteEmailHash: emailHash,
        inviteExpiresAt: expiresAt,
      },
    });
    if (updated.count !== 1) {
      throw new CoupleSpaceError("NO_PENDING_INVITE");
    }
    return { code, codeHash, expiresAt, spaceId: space.id };
  });
}

export async function revokeCoupleInvite(
  spaceId: string,
  codeHash: string,
): Promise<void> {
  await prisma.coupleSpace.updateMany({
    where: { id: spaceId, inviteCodeHash: codeHash, userBId: null },
    data: {
      inviteCodeHash: null,
      inviteEmailHash: null,
      inviteExpiresAt: null,
    },
  });
}

export async function joinCoupleSpaceByInvite(
  actorId: string,
  suppliedCode: string,
  now = new Date(),
): Promise<{ spaceId: string }> {
  try {
    return await serializable(async (tx) => {
      const actor = await tx.user.findFirst({
        where: {
          id: actorId,
          deletedAt: null,
          ...activeSensitiveDataConsentUserWhere,
        },
        select: { id: true, email: true, isVerified: true, season: true },
      });
      if (!actor || !actor.isVerified) {
        throw new CoupleSpaceError("EMAIL_NOT_VERIFIED");
      }

      const codeHash = hashCoupleInviteCode(suppliedCode);
      const emailHash = hashCoupleInviteEmail(actor.email);
      const space = await tx.coupleSpace.findFirst({
        where: {
          inviteCodeHash: codeHash,
          inviteEmailHash: emailHash,
          inviteExpiresAt: { gt: now },
          status: "PENDING",
          userBId: null,
          userA: { is: activeSensitiveDataConsentUserWhere },
        },
        select: {
          id: true,
          userAId: true,
          season: true,
          marriedAt: true,
        },
      });
      if (!space || space.userAId === actorId) {
        throw new CoupleSpaceError("CODE_INVALID");
      }

      const occupied = await tx.coupleSpace.findFirst({
        where: memberFilter(actorId),
        select: { id: true },
      });
      if (occupied) throw new CoupleSpaceError("SPACE_EXISTS");
      if (actor.season !== "JOURNEY" && actor.season !== space.season) {
        throw new CoupleSpaceError("SEASON_MISMATCH");
      }

      const pairKey = canonicalCouplePairKey(space.userAId, actorId);
      const married = space.season === "MARRIED" || space.season === "PARENTS";
      const claimed = await tx.coupleSpace.updateMany({
        where: {
          id: space.id,
          inviteCodeHash: codeHash,
          inviteEmailHash: emailHash,
          inviteExpiresAt: { gt: now },
          status: "PENDING",
          userBId: null,
        },
        data: {
          userBId: actorId,
          pairKey,
          status: "ACTIVE",
          inviteCode: null,
          inviteCodeHash: null,
          inviteEmailHash: null,
          inviteExpiresAt: null,
          marriedAt: married ? (space.marriedAt ?? now) : null,
        },
      });
      if (claimed.count !== 1) {
        throw new CoupleSpaceError("CODE_INVALID");
      }
      await setMembersSeason(
        tx,
        space.userAId,
        actorId,
        space.season as "ENGAGED" | "MARRIED" | "PARENTS",
      );
      return { spaceId: space.id };
    });
  } catch (error) {
    if (isPrismaError(error, "P2002") || isPrismaError(error, "P2004")) {
      throw new CoupleSpaceError("SPACE_EXISTS");
    }
    throw error;
  }
}

export async function confirmMatchCoupleSpace(
  actorId: string,
  now = new Date(),
): Promise<{ spaceId: string }> {
  return serializable(async (tx) => {
    const space = await tx.coupleSpace.findFirst({
      where: {
        AND: [consentingCoupleSpaceMemberWhere(actorId)],
        userBId: actorId,
        status: "PENDING",
        origin: "MATCH",
      },
      select: { id: true, userAId: true, userBId: true, matchId: true },
    });
    if (!space || !space.userBId || !space.matchId) {
      throw new CoupleSpaceError("NO_PENDING_SPACE");
    }
    const match = await tx.match.findFirst({
      where: {
        id: space.matchId,
        ...activeSensitiveDataConsentPairWhere,
        status: "ACTIVE",
        OR: [
          { userAId: space.userAId, userBId: actorId },
          { userAId: actorId, userBId: space.userAId },
        ],
      },
      select: { id: true },
    });
    if (!match) throw new CoupleSpaceError("NO_PENDING_SPACE");

    const activated = await tx.coupleSpace.updateMany({
      where: {
        id: space.id,
        userBId: actorId,
        status: "PENDING",
        origin: "MATCH",
      },
      data: {
        status: "ACTIVE",
        season: "MARRIED",
        marriedAt: now,
        inviteCode: null,
        inviteCodeHash: null,
        inviteEmailHash: null,
        inviteExpiresAt: null,
      },
    });
    if (activated.count !== 1) {
      throw new CoupleSpaceError("NO_PENDING_SPACE");
    }

    await setMembersSeason(tx, space.userAId, actorId, "MARRIED");
    const closed = await tx.match.updateMany({
      where: { id: match.id, status: "ACTIVE" },
      data: { stage: "CLOSED", status: "CLOSED" },
    });
    if (closed.count !== 1) {
      throw new CoupleSpaceError("NO_PENDING_SPACE");
    }
    return { spaceId: space.id };
  });
}

export type CoupleSeasonChange =
  | { state: "REQUESTED"; season: "MARRIED" | "PARENTS" }
  | { state: "ALREADY_REQUESTED"; season: "MARRIED" | "PARENTS" }
  | { state: "ADVANCED"; season: "MARRIED" | "PARENTS" };

export async function requestCoupleSeasonChange(
  actorId: string,
  target: "MARRIED" | "PARENTS",
  now = new Date(),
): Promise<CoupleSeasonChange> {
  return serializable(async (tx) => {
    const space = await tx.coupleSpace.findFirst({
      where: {
        AND: [consentingCoupleSpaceMemberWhere(actorId)],
        status: "ACTIVE",
      },
      select: {
        id: true,
        userAId: true,
        userBId: true,
        season: true,
        marriedAt: true,
        seasonRequestedBy: true,
        seasonRequestedTarget: true,
      },
    });
    if (!space || !space.userBId) throw new CoupleSpaceError("NO_SPACE");
    if (expectedNextCoupleSeason(space.season) !== target) {
      throw new CoupleSpaceError("INVALID_TRANSITION");
    }

    if (!space.seasonRequestedBy) {
      const requested = await tx.coupleSpace.updateMany({
        where: {
          id: space.id,
          status: "ACTIVE",
          season: space.season,
          seasonRequestedBy: null,
          seasonRequestedTarget: null,
        },
        data: {
          seasonRequestedBy: actorId,
          seasonRequestedTarget: target,
          seasonRequestedAt: now,
        },
      });
      if (requested.count !== 1) {
        throw new CoupleSpaceError("SEASON_REQUEST_CONFLICT");
      }
      return { state: "REQUESTED", season: target };
    }

    if (
      space.seasonRequestedBy === actorId &&
      space.seasonRequestedTarget === target
    ) {
      return { state: "ALREADY_REQUESTED", season: target };
    }
    if (
      space.seasonRequestedBy === actorId ||
      space.seasonRequestedTarget !== target
    ) {
      throw new CoupleSpaceError("SEASON_REQUEST_CONFLICT");
    }

    const advanced = await tx.coupleSpace.updateMany({
      where: {
        id: space.id,
        status: "ACTIVE",
        season: space.season,
        seasonRequestedBy: space.seasonRequestedBy,
        seasonRequestedTarget: target,
      },
      data: {
        season: target,
        seasonRequestedBy: null,
        seasonRequestedTarget: null,
        seasonRequestedAt: null,
        marriedAt:
          target === "MARRIED" && space.marriedAt == null
            ? now
            : space.marriedAt,
      },
    });
    if (advanced.count !== 1) {
      throw new CoupleSpaceError("SEASON_REQUEST_CONFLICT");
    }
    await setMembersSeason(tx, space.userAId, space.userBId, target);
    return { state: "ADVANCED", season: target };
  });
}
