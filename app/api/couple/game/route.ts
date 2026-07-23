import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, readJsonLimited, withErrors } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";
import { rateLimit, LIMITS } from "@/lib/security/rate-limit";
import type { Locale } from "@/lib/core-engine";
import {
  createRound,
  getGameState,
  type GameSurface,
} from "@/lib/games/engine";
import { consentingCoupleSpaceMemberWhere } from "@/lib/sensitive-data-consent";

// callLLM (via lib/games/engine) requiert le runtime Node.
export const runtime = "nodejs";

/**
 * Jeu des questions — surface COUPLE (Espace Couple ACTIF du user courant).
 *
 * Miroir exact de la surface MATCH, mais la surface est résolue via l'Espace
 * Couple ACTIF (pas de matchId dans l'URL) ; les deux conjoints sont des
 * humains par construction (aucun garde-fou Compagnon IA nécessaire).
 */

/** Espace Couple ACTIF du user (les deux conjoints liés). */
async function activeSpace(userId: string) {
  return prisma.coupleSpace.findFirst({
    where: {
      AND: [consentingCoupleSpaceMemberWhere(userId)],
      status: "ACTIVE",
      userBId: { not: null },
    },
    select: { id: true, userAId: true, userBId: true },
  });
}

/** Résout la surface de jeu du couple actif, ou null si aucun espace. */
async function resolveCoupleSurface(
  userId: string,
  locale: Locale,
): Promise<GameSurface | null> {
  const space = await activeSpace(userId);
  if (!space || !space.userBId) return null;
  const otherUserId = space.userAId === userId ? space.userBId : space.userAId;
  return {
    kind: "couple",
    surfaceId: space.id,
    userId,
    otherUserId,
    locale,
  };
}

export const GET = withErrors(async () => {
  const user = await requireUser();
  const locale = (user.locale ?? "fr") as Locale;
  const surface = await resolveCoupleSurface(user.id, locale);
  if (!surface) {
    return NextResponse.json({
      rounds: [],
      seenCount: 0,
      bankSize: 0,
      bankRemaining: 0,
    });
  }
  return NextResponse.json(await getGameState(surface));
});

const createSchema = z.object({ mode: z.enum(["SHARED", "GUESS"]) });

export const POST = withErrors(async (req: Request) => {
  const user = await requireUser();
  const rl = await rateLimit(
    `game:${user.id}`,
    LIMITS.game.limit,
    LIMITS.game.windowMs,
  );
  if (!rl.allowed) return jsonError(429, "RATE_LIMITED");

  const locale = (user.locale ?? "fr") as Locale;
  const surface = await resolveCoupleSurface(user.id, locale);
  if (!surface) return jsonError(404, "NO_SPACE");

  const { mode } = createSchema.parse(await readJsonLimited(req));
  const { view } = await createRound(surface, mode);
  return NextResponse.json({ round: view }, { status: 201 });
});
