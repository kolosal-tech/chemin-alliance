import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  jsonError,
  readOptionalJsonLimited,
  withErrors,
} from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";
import { CHECKIN_QUESTIONS, SEASON_PROGRAMS } from "@/lib/agents/guardian";
import type { Locale } from "@/lib/core-engine";
import {
  CoupleSpaceError,
  createExternalCoupleSpace,
  createMatchCoupleSpace,
} from "@/lib/couple-space";
import {
  activeSensitiveDataConsentPairWhere,
  consentingCoupleSpaceMemberWhere,
} from "@/lib/sensitive-data-consent";

async function mySpace(userId: string) {
  return prisma.coupleSpace.findFirst({
    where: consentingCoupleSpaceMemberWhere(userId),
    include: {
      userA: { select: { id: true, displayName: true } },
      userB: { select: { id: true, displayName: true } },
    },
  });
}

export const GET = withErrors(async () => {
  const user = await requireUser();
  const space = await mySpace(user.id);
  if (!space) {
    // Match éligible pour « nous nous sommes mariés » ?
    const eligibleMatch = await prisma.match.findFirst({
      where: {
        OR: [{ userAId: user.id }, { userBId: user.id }],
        ...activeSensitiveDataConsentPairWhere,
        status: "ACTIVE",
        stage: { in: ["COMMITMENT", "MARRIAGE_PREPARATION"] },
      },
      include: {
        userA: { select: { id: true, displayName: true } },
        userB: { select: { id: true, displayName: true } },
      },
    });
    return NextResponse.json({
      space: null,
      season: user.season,
      eligibleMatch: eligibleMatch && {
        id: eligibleMatch.id,
        other:
          eligibleMatch.userAId === user.id
            ? eligibleMatch.userB.displayName
            : eligibleMatch.userA.displayName,
      },
    });
  }
  const locale = (user.locale ?? "fr") as Locale;
  const season =
    space.season === "PARENTS"
      ? "PARENTS"
      : space.season === "ENGAGED"
        ? "ENGAGED"
        : "MARRIED";
  const lastCheckin = await prisma.agentInsight.findFirst({
    where: { userId: user.id, agentId: "guardian", kind: "CHECKIN" },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({
    space: {
      id: space.id,
      status: space.status,
      season: space.season,
      origin: space.origin,
      // Un code d'invitation est un bearer secret : il n'est jamais relu ni
      // renvoyé par GET. Une émission explicite le retourne une seule fois.
      inviteCode: null,
      invitePending:
        space.userBId == null &&
        space.inviteCodeHash != null &&
        space.inviteExpiresAt != null &&
        space.inviteExpiresAt > new Date(),
      inviteExpiresAt: space.userBId == null ? space.inviteExpiresAt : null,
      partner:
        space.userAId === user.id
          ? (space.userB?.displayName ?? null)
          : space.userA.displayName,
      iAmCreator: space.userAId === user.id,
      pendingMyConfirmation:
        space.status === "PENDING" && space.userBId === user.id,
      seasonRequest:
        space.seasonRequestedBy && space.seasonRequestedTarget
          ? {
              season: space.seasonRequestedTarget,
              mine: space.seasonRequestedBy === user.id,
            }
          : null,
    },
    questions: CHECKIN_QUESTIONS[season].map((q) => ({
      id: q.id,
      text: q.text[locale] ?? q.text.fr,
      kind: q.kind ?? "scale",
    })),
    programs: SEASON_PROGRAMS[season].map((p) => ({
      id: p.id,
      title: p.title[locale] ?? p.title.fr,
      body: p.body[locale] ?? p.body.fr,
    })),
    lastCheckinAt: lastCheckin?.createdAt ?? null,
  });
});

const createSchema = z.object({ matchId: z.string().optional() });

/** Créer l'espace : depuis un match avancé, ou autonome (couple externe). */
export const POST = withErrors(async (req: Request) => {
  const user = await requireUser();
  const { matchId } = createSchema.parse(
    (await readOptionalJsonLimited(req)) ?? {},
  );

  try {
    if (matchId) {
      const result = await createMatchCoupleSpace(user.id, matchId);
      return NextResponse.json(
        { ok: true, ...result },
        { status: 201, headers: { "cache-control": "no-store" } },
      );
    }

    const result = await createExternalCoupleSpace(user.id);
    return NextResponse.json(
      { ok: true, ...result },
      { status: 201, headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof CoupleSpaceError) {
      return jsonError(error.status, error.code);
    }
    throw error;
  }
});
