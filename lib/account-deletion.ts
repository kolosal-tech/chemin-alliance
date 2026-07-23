import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export type DeletedUserDataInput = {
  passwordHash: string;
  now: Date;
  emailNonce: string;
};

/**
 * Valeurs minimales conservées sur la ligne User pseudonymisée. La ligne reste
 * nécessaire pour ne pas effacer par cascade les données appartenant aux tiers
 * d'un ancien match, mais elle ne permet plus d'identifier ni d'authentifier la
 * personne supprimée.
 */
export function deletedUserData({
  passwordHash,
  now,
  emailNonce,
}: DeletedUserDataInput): Prisma.UserUpdateInput {
  return {
    deletedAt: now,
    email: `deleted-${emailNonce}@deleted.invalid`,
    displayName: "Membre retiré",
    age: 18,
    gender: null,
    role: "USER",
    kind: "HUMAN",
    locale: "fr",
    rulesetId: "christian_evangelical_default",
    season: "JOURNEY",
    passwordHash,
    isVerified: false,
    emailVerifyToken: null,
    emailVerifyExpires: null,
    passwordResetToken: null,
    passwordResetExpires: null,
    photoUrl: null,
    photoBlurhash: null,
    photoBlurredByDefault: true,
    cityApprox: null,
    country: null,
    phone: null,
    phoneVerified: false,
    stripeCustomerId: null,
    subscriptionStatus: null,
    lastDevotionDate: null,
    currentStreak: 0,
    longestStreak: 0,
    onboardingDoneAt: null,
    sessionVersion: { increment: 1 },
    updatedAt: now,
  };
}

/**
 * Effacement transactionnel des données propres au membre.
 *
 * Les signalements sont volontairement conservés sous l'identité pseudonymisée
 * pendant la durée légale annoncée (12 mois). Les contenus appartenant à un
 * tiers restent en base, mais le lien de match est fermé et purgé de toute
 * donnée calculée ou de tout contenu produit par le membre supprimé.
 */
export async function eraseAccountData(
  userId: string,
  passwordHash: string,
  now = new Date(),
): Promise<void> {
  const emailNonce = randomBytes(16).toString("hex");

  await prisma.$transaction(async (tx) => {
    const [matches, ownedCoupleSpace, joinedCoupleSpace] = await Promise.all([
      tx.match.findMany({
        where: { OR: [{ userAId: userId }, { userBId: userId }] },
        select: { id: true },
      }),
      tx.coupleSpace.findUnique({
        where: { userAId: userId },
        select: { id: true, userBId: true },
      }),
      tx.coupleSpace.findUnique({
        where: { userBId: userId },
        select: { id: true },
      }),
    ]);
    const matchIds = matches.map((match) => match.id);
    const coupleSpaceIds = [
      ...new Set(
        [ownedCoupleSpace?.id, joinedCoupleSpace?.id].filter(
          (id): id is string => id !== undefined,
        ),
      ),
    ];

    await tx.agentInsight.deleteMany({
      where: {
        OR: [
          { userId },
          ...(matchIds.length > 0 ? [{ matchId: { in: matchIds } }] : []),
          ...(coupleSpaceIds.length > 0
            ? [{ coupleSpaceId: { in: coupleSpaceIds } }]
            : []),
        ],
      },
    });
    await tx.gameRoundAnswer.deleteMany({ where: { userId } });
    await tx.gameRound.deleteMany({ where: { initiatorId: userId } });
    await tx.allianceAnswer.deleteMany({ where: { userId } });
    await tx.message.deleteMany({ where: { senderId: userId } });
    if (matchIds.length > 0) {
      // Les messages système peuvent incorporer le nom ou une réponse du
      // membre ; ils sont dérivés de la relation et non la donnée du tiers.
      await tx.message.deleteMany({
        where: { matchId: { in: matchIds }, kind: "SYSTEM" },
      });
    }
    await tx.coupleMessage.deleteMany({ where: { senderId: userId } });

    await tx.faithProfile.deleteMany({ where: { userId } });
    await tx.relationshipProfile.deleteMany({ where: { userId } });
    await tx.privacySettings.deleteMany({ where: { userId } });
    await tx.aiCoachTransferLease.deleteMany({ where: { userId } });
    await tx.consent.deleteMany({ where: { userId } });
    await tx.booking.deleteMany({ where: { userId } });
    await tx.aiCoachUsage.deleteMany({ where: { userId } });
    await tx.coachMessage.deleteMany({ where: { userId } });
    await tx.pushSubscription.deleteMany({ where: { userId } });
    await tx.phoneVerification.deleteMany({ where: { userId } });
    await tx.blessing.deleteMany({ where: { userId } });
    await tx.sponsor.deleteMany({ where: { userId } });
    await tx.aiCompanionMeta.deleteMany({ where: { userId } });
    await tx.block.deleteMany({
      where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    });
    await tx.pass.deleteMany({
      where: { OR: [{ passerId: userId }, { passedId: userId }] },
    });

    if (matchIds.length > 0) {
      await tx.match.updateMany({
        where: { id: { in: matchIds } },
        data: {
          status: "CLOSED",
          stage: "CLOSED",
          compatibilityJson: Prisma.DbNull,
          contactExchange: "REVOKED",
          contactExchangeRequestedBy: null,
          advanceRequestedBy: null,
          requestedById: null,
          closedBy: null,
          closeMessage: null,
        },
      });
    }

    if (joinedCoupleSpace) {
      await tx.coupleSpace.update({
        where: { id: joinedCoupleSpace.id },
        data: {
          userBId: null,
          status: "PENDING",
          matchId: null,
          marriedAt: null,
          pairKey: null,
          inviteCode: null,
          inviteCodeHash: null,
          inviteEmailHash: null,
          inviteExpiresAt: null,
          seasonRequestedBy: null,
          seasonRequestedTarget: null,
          seasonRequestedAt: null,
        },
      });
    }
    if (ownedCoupleSpace) {
      if (ownedCoupleSpace.userBId) {
        // Le conjoint tiers devient propriétaire de l'espace vidé plutôt que
        // de perdre sa propre ligne et ses contenus par cascade.
        await tx.coupleSpace.update({
          where: { id: ownedCoupleSpace.id },
          data: {
            userAId: ownedCoupleSpace.userBId,
            userBId: null,
            status: "PENDING",
            matchId: null,
            marriedAt: null,
            pairKey: null,
            inviteCode: null,
            inviteCodeHash: null,
            inviteEmailHash: null,
            inviteExpiresAt: null,
            seasonRequestedBy: null,
            seasonRequestedTarget: null,
            seasonRequestedAt: null,
          },
        });
      } else {
        await tx.coupleSpace.delete({ where: { id: ownedCoupleSpace.id } });
      }
    }

    await tx.user.update({
      where: { id: userId },
      data: deletedUserData({ passwordHash, now, emailNonce }),
    });
  });
}
