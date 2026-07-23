import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { activeSensitiveDataConsentPairWhere } from "@/lib/sensitive-data-consent";

// Blocage user-à-user - GRATUIT À VIE (doctrine, lib/payments/entitlements).
// Un blocage est SYMÉTRIQUE dans ses effets : les deux personnes deviennent
// mutuellement invisibles et ne peuvent plus échanger, quel que soit l'auteur.

/** IDs des personnes bloquées par moi OU qui m'ont bloqué (pour le matching). */
export async function blockedUserIds(userId: string): Promise<string[]> {
  const blocks = await prisma.block.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    select: { blockerId: true, blockedId: true },
  });
  const ids = new Set<string>();
  for (const b of blocks) {
    ids.add(b.blockerId);
    ids.add(b.blockedId);
  }
  ids.delete(userId);
  return [...ids];
}

/** Un blocage existe-t-il dans un sens OU l'autre entre deux personnes ? */
export async function isBlockedBetween(a: string, b: string): Promise<boolean> {
  const found = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: a, blockedId: b },
        { blockerId: b, blockedId: a },
      ],
    },
    select: { id: true },
  });
  return Boolean(found);
}

/**
 * Filtre Prisma commun aux lectures d'un match : l'utilisateur doit en être
 * membre et aucun blocage ne doit exister dans un sens ou dans l'autre.
 *
 * Le test du blocage est porté par la même requête SQL que la lecture du
 * match. On évite ainsi le classique « vérifier puis lire » qui pourrait
 * exposer une conversation si un blocage est validé entre les deux requêtes.
 */
export function unblockedMatchWhere(userId: string): Prisma.MatchWhereInput {
  return {
    OR: [
      {
        userAId: userId,
        userB: {
          is: {
            blocksMade: { none: { blockedId: userId } },
            blocksReceived: { none: { blockerId: userId } },
          },
        },
      },
      {
        userBId: userId,
        userA: {
          is: {
            blocksMade: { none: { blockedId: userId } },
            blocksReceived: { none: { blockerId: userId } },
          },
        },
      },
    ],
  };
}

/** Un fil ACTIVE, membre et non bloqué, utilisable pour page et API. */
export function accessibleConversationWhere(
  matchId: string,
  userId: string,
): Prisma.MatchWhereInput {
  return {
    AND: [
      { id: matchId, status: "ACTIVE" },
      activeSensitiveDataConsentPairWhere,
      unblockedMatchWhere(userId),
    ],
  };
}

export class BlockTargetNotFoundError extends Error {
  readonly status = 404;

  constructor() {
    super("BLOCK_TARGET_NOT_FOUND");
    this.name = "BlockTargetNotFoundError";
  }
}

/**
 * Rend le blocage et la fermeture de toutes les relations de la paire
 * atomiques. SERIALIZABLE coordonne cette opération avec la création de match,
 * qui emploie le même niveau d'isolation et revalide également les blocages.
 */
export async function blockUserAndCloseMatches(
  blockerId: string,
  blockedId: string,
): Promise<void> {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await prisma.$transaction(
        async (tx) => {
          const target = await tx.user.findFirst({
            where: { id: blockedId, deletedAt: null },
            select: { id: true },
          });
          if (!target) throw new BlockTargetNotFoundError();

          await tx.block.upsert({
            where: {
              blockerId_blockedId: { blockerId, blockedId },
            },
            create: { blockerId, blockedId },
            update: {},
          });

          await tx.match.updateMany({
            where: {
              status: { not: "CLOSED" },
              OR: [
                { userAId: blockerId, userBId: blockedId },
                { userAId: blockedId, userBId: blockerId },
              ],
            },
            data: {
              stage: "CLOSED",
              status: "CLOSED",
              closedBy: blockerId,
              closeMessage: null,
              contactExchange: "REVOKED",
              contactExchangeRequestedBy: null,
              advanceRequestedBy: null,
            },
          });

          await tx.blessing.deleteMany({
            where: {
              status: "PENDING",
              match: {
                is: {
                  OR: [
                    { userAId: blockerId, userBId: blockedId },
                    { userAId: blockedId, userBId: blockerId },
                  ],
                },
              },
            },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      return;
    } catch (error) {
      if (error instanceof BlockTargetNotFoundError) throw error;
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034" &&
        attempt < maxAttempts
      ) {
        continue;
      }
      throw error;
    }
  }
}
