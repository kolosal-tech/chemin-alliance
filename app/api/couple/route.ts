import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, readJsonLimited, withErrors } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";
import {
  generateInviteCode,
  CHECKIN_QUESTIONS,
  SEASON_PROGRAMS,
} from "@/lib/agents/guardian";
import type { Locale } from "@/lib/core-engine";

async function mySpace(userId: string) {
  return prisma.coupleSpace.findFirst({
    where: { OR: [{ userAId: userId }, { userBId: userId }] },
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
      inviteCode: space.userBId ? null : space.inviteCode,
      partner:
        space.userAId === user.id
          ? (space.userB?.displayName ?? null)
          : space.userA.displayName,
      iAmCreator: space.userAId === user.id,
      pendingMyConfirmation:
        space.status === "PENDING" && space.userBId === user.id,
    },
    questions: CHECKIN_QUESTIONS[season].map((q) => ({
      id: q.id,
      text: q.text[locale] ?? q.text.fr,
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
  if (await mySpace(user.id)) return jsonError(409, "SPACE_EXISTS");
  const { matchId } = createSchema.parse(
    await readJsonLimited(req).catch(() => ({})),
  );

  if (matchId) {
    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match || (match.userAId !== user.id && match.userBId !== user.id)) {
      return jsonError(404, "NOT_FOUND");
    }
    if (!["COMMITMENT", "MARRIAGE_PREPARATION"].includes(match.stage)) {
      return jsonError(409, "STAGE_NOT_ELIGIBLE");
    }
    const otherId = match.userAId === user.id ? match.userBId : match.userAId;
    const space = await prisma.coupleSpace.create({
      data: {
        userAId: user.id,
        userBId: otherId,
        status: "PENDING", // l'autre doit confirmer le mariage
        origin: "MATCH",
        matchId: match.id,
        inviteCode: generateInviteCode(),
      },
    });
    return NextResponse.json(
      { ok: true, spaceId: space.id, pendingPartner: true },
      { status: 201 },
    );
  }

  // Garde : seuls les fiancés ou les déjà-mariés créent un espace externe.
  // Un user en discernement (JOURNEY) ne peut pas s'auto-promouvoir MARRIED
  // par cette voie — il passe par le chemin match (matchId ci-dessus).
  if (user.season !== "ENGAGED" && user.season !== "MARRIED") {
    return jsonError(409, "NOT_ELIGIBLE");
  }

  // Couple externe (déjà fiancés ou déjà mariés) : espace solo + code conjoint.
  const engaged = user.season === "ENGAGED";
  const space = await prisma.coupleSpace.create({
    data: {
      userAId: user.id,
      origin: engaged ? "ENGAGED" : "EXTERNAL",
      season: engaged ? "ENGAGED" : "MARRIED",
      inviteCode: generateInviteCode(),
      marriedAt: engaged ? null : new Date(),
    },
  });
  // Fiancés : la saison ENGAGED est déjà posée à l'inscription, on n'y touche pas.
  if (!engaged) {
    await prisma.user.update({
      where: { id: user.id },
      data: { season: "MARRIED" },
    });
  }
  return NextResponse.json(
    { ok: true, spaceId: space.id, inviteCode: space.inviteCode },
    { status: 201 },
  );
});
