import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { jsonError, withErrors } from "@/lib/api-helpers";
import { requireAuthenticatedUser } from "@/lib/security/session";
import { buildAccountExport, EXPORT_QUERY_TAKE } from "@/lib/account-export";
import { rateLimit, LIMITS } from "@/lib/security/rate-limit";

/** RGPD - droit d'accès et à la portabilité : export JSON lisible et borné. */
export const GET = withErrors(async () => {
  const user = await requireAuthenticatedUser();
  const rl = await rateLimit(
    `export:${user.id}`,
    LIMITS.export.limit,
    LIMITS.export.windowMs,
  );
  if (!rl.allowed) return jsonError(429, "RATE_LIMITED");

  const memberMatchWhere: Prisma.MatchWhereInput = {
    OR: [{ userAId: user.id }, { userBId: user.id }],
  };
  const memberCoupleWhere: Prisma.CoupleSpaceWhereInput = {
    OR: [{ userAId: user.id }, { userBId: user.id }],
  };

  const [
    consents,
    matches,
    matchMessages,
    allianceAnswers,
    coachMessages,
    agentInsights,
    coupleSpace,
    coupleMessages,
    gameRounds,
    sponsor,
    blocksMade,
    passesMade,
    bookings,
    reportsMade,
    reportsReceived,
    aiCoachUsages,
    phoneVerifications,
    blocksReceived,
    passesReceived,
    registeredPushDevices,
  ] = await prisma.$transaction(
    [
      prisma.consent.findMany({
        where: { userId: user.id },
        select: {
          id: true,
          type: true,
          version: true,
          purpose: true,
          recipient: true,
          grantedAt: true,
          revokedAt: true,
        },
        orderBy: { grantedAt: "asc" },
        take: EXPORT_QUERY_TAKE,
      }),
      prisma.match.findMany({
        where: memberMatchWhere,
        select: {
          id: true,
          userAId: true,
          userBId: true,
          userA: { select: { id: true, displayName: true } },
          userB: { select: { id: true, displayName: true } },
          stage: true,
          status: true,
          compatibilityJson: true,
          contactExchange: true,
          contactExchangeRequestedBy: true,
          advanceRequestedBy: true,
          requestedById: true,
          closedBy: true,
          closeMessage: true,
          createdAt: true,
          updatedAt: true,
          lastReadAtUserA: true,
          lastReadAtUserB: true,
        },
        orderBy: { createdAt: "asc" },
        take: EXPORT_QUERY_TAKE,
      }),
      prisma.message.findMany({
        where: {
          match: memberMatchWhere,
          // Un message modéré BLOCKED n'a jamais été remis à son destinataire.
          // Il appartient toutefois à son expéditeur et reste dans son export.
          OR: [{ senderId: user.id }, { moderationStatus: { not: "BLOCKED" } }],
        },
        select: {
          id: true,
          matchId: true,
          senderId: true,
          contentEncrypted: true,
          kind: true,
          moderationStatus: true,
          blockedReason: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
        take: EXPORT_QUERY_TAKE,
      }),
      prisma.allianceAnswer.findMany({
        where: { userId: user.id },
        select: {
          id: true,
          matchId: true,
          stage: true,
          questionId: true,
          answerEncrypted: true,
          answerLegacy: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
        take: EXPORT_QUERY_TAKE,
      }),
      prisma.coachMessage.findMany({
        where: { userId: user.id },
        select: {
          id: true,
          mode: true,
          role: true,
          contentEncrypted: true,
          guardrail: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
        take: EXPORT_QUERY_TAKE,
      }),
      prisma.agentInsight.findMany({
        // Les insights sans userId peuvent décrire un tiers ou une décision de
        // modération : seuls ceux rattachés au membre sont exportés.
        where: { userId: user.id },
        select: {
          id: true,
          matchId: true,
          coupleSpaceId: true,
          agentId: true,
          kind: true,
          dataJson: true,
          visibility: true,
          createdAt: true,
          revokedAt: true,
        },
        orderBy: { createdAt: "asc" },
        take: EXPORT_QUERY_TAKE,
      }),
      prisma.coupleSpace.findFirst({
        where: memberCoupleWhere,
        select: {
          id: true,
          userAId: true,
          userBId: true,
          userA: { select: { id: true, displayName: true } },
          userB: { select: { id: true, displayName: true } },
          status: true,
          origin: true,
          matchId: true,
          season: true,
          marriedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.coupleMessage.findMany({
        where: { space: memberCoupleWhere },
        select: {
          id: true,
          spaceId: true,
          senderId: true,
          contentEncrypted: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
        take: EXPORT_QUERY_TAKE,
      }),
      prisma.gameRound.findMany({
        where: {
          OR: [{ match: memberMatchWhere }, { coupleSpace: memberCoupleWhere }],
        },
        select: {
          id: true,
          matchId: true,
          coupleSpaceId: true,
          mode: true,
          questionKey: true,
          questionText: true,
          initiatorId: true,
          status: true,
          createdAt: true,
          revealedAt: true,
          answers: {
            where: { userId: user.id },
            select: {
              id: true,
              answerEncrypted: true,
              guessEncrypted: true,
              createdAt: true,
            },
            take: 1,
          },
        },
        orderBy: { createdAt: "asc" },
        take: EXPORT_QUERY_TAKE,
      }),
      prisma.sponsor.findUnique({
        where: { userId: user.id },
        select: {
          name: true,
          email: true,
          relation: true,
          createdAt: true,
          blessings: {
            select: {
              id: true,
              matchId: true,
              status: true,
              noteEncrypted: true,
              createdAt: true,
              respondedAt: true,
            },
            orderBy: { createdAt: "asc" },
            take: EXPORT_QUERY_TAKE,
          },
        },
      }),
      prisma.block.findMany({
        where: { blockerId: user.id },
        select: {
          id: true,
          createdAt: true,
          blocked: {
            select: { id: true, displayName: true },
          },
        },
        orderBy: { createdAt: "asc" },
        take: EXPORT_QUERY_TAKE,
      }),
      prisma.pass.findMany({
        where: { passerId: user.id },
        select: {
          id: true,
          createdAt: true,
          passed: {
            select: { id: true, displayName: true },
          },
        },
        orderBy: { createdAt: "asc" },
        take: EXPORT_QUERY_TAKE,
      }),
      prisma.booking.findMany({
        where: { userId: user.id },
        select: {
          id: true,
          slotStart: true,
          status: true,
          createdAt: true,
          coach: {
            select: {
              id: true,
              displayName: true,
              affiliation: true,
              specialties: true,
              pricePerSessionEUR: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
        take: EXPORT_QUERY_TAKE,
      }),
      prisma.report.findMany({
        where: { reporterId: user.id },
        select: {
          id: true,
          reason: true,
          status: true,
          createdAt: true,
          resolvedAt: true,
          target: { select: { id: true, displayName: true } },
        },
        orderBy: { createdAt: "asc" },
        take: EXPORT_QUERY_TAKE,
      }),
      prisma.report.findMany({
        where: { targetUserId: user.id },
        select: {
          id: true,
          status: true,
          createdAt: true,
          resolvedAt: true,
        },
        orderBy: { createdAt: "asc" },
        take: EXPORT_QUERY_TAKE,
      }),
      prisma.aiCoachUsage.findMany({
        where: { userId: user.id },
        select: { day: true, count: true },
        orderBy: { day: "asc" },
        take: EXPORT_QUERY_TAKE,
      }),
      prisma.phoneVerification.findMany({
        where: { userId: user.id },
        select: {
          id: true,
          expiresAt: true,
          attempts: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
        take: EXPORT_QUERY_TAKE,
      }),
      prisma.block.count({ where: { blockedId: user.id } }),
      prisma.pass.count({ where: { passedId: user.id } }),
      prisma.pushSubscription.count({ where: { userId: user.id } }),
    ],
    { isolationLevel: "RepeatableRead" },
  );

  const data = buildAccountExport({
    account: user,
    faithProfile: user.faithProfile,
    relationshipProfile: user.relationshipProfile,
    privacySettings: user.privacySettings,
    consents,
    matches,
    matchMessages,
    allianceAnswers,
    coachMessages,
    agentInsights,
    coupleSpace,
    coupleMessages,
    gameRounds,
    sponsor,
    blocksMade: blocksMade.map((row) => ({
      id: row.id,
      createdAt: row.createdAt,
      other: row.blocked,
    })),
    passesMade: passesMade.map((row) => ({
      id: row.id,
      createdAt: row.createdAt,
      other: row.passed,
    })),
    bookings,
    reportsMade,
    reportsReceived,
    aiCoachUsages,
    phoneVerifications,
    restrictedThirdPartyCounts: { blocksReceived, passesReceived },
    registeredPushDevices,
  });

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition":
        'attachment; filename="chemin-alliance-export.json"',
      "cache-control": "private, no-store, max-age=0",
      pragma: "no-cache",
      expires: "0",
      "x-content-type-options": "nosniff",
    },
  });
});
