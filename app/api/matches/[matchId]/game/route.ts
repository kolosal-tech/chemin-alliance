import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, readJsonLimited, withErrors } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";
import { requireActiveMatchMember } from "@/lib/alliance";
import { rateLimit, LIMITS } from "@/lib/security/rate-limit";
import type { Locale } from "@/lib/core-engine";
import {
  createRound,
  getGameState,
  type GameSurface,
} from "@/lib/games/engine";

// callLLM (via lib/games/engine) + web-push requièrent le runtime Node.
export const runtime = "nodejs";

/**
 * Jeu des questions — surface MATCH (humain-humain uniquement).
 *
 * SÉCURITÉ : le jeu est réservé aux échanges entre HUMAINS. Si l'autre membre
 * du match est un Compagnon IA (kind AI_COMPANION), l'accès est refusé (403) :
 * les compagnons disposent déjà de leurs "Outils de discernement".
 *
 * Le GET est filtré-sécurisé par l'engine (aucun contenu de l'autre joueur
 * n'est déchiffré avant status REVEALED).
 */

/** Résout la surface de jeu d'un match + garde-fou anti-compagnon IA. */
async function resolveMatchSurface(
  matchId: string,
  userId: string,
  locale: Locale,
): Promise<GameSurface | { error: NextResponse }> {
  const match = await requireActiveMatchMember(matchId, userId);
  const otherUserId = match.userAId === userId ? match.userBId : match.userAId;
  const other = await prisma.user.findUnique({
    where: { id: otherUserId },
    select: { kind: true },
  });
  if (other?.kind === "AI_COMPANION") {
    return { error: jsonError(403, "GAME_HUMAN_ONLY") };
  }
  return { kind: "match", surfaceId: match.id, userId, otherUserId, locale };
}

export const GET = withErrors(
  async (
    _req: Request,
    { params }: { params: Promise<{ matchId: string }> },
  ) => {
    const user = await requireUser();
    const locale = (user.locale ?? "fr") as Locale;
    const surface = await resolveMatchSurface(
      (await params).matchId,
      user.id,
      locale,
    );
    if ("error" in surface) return surface.error;
    return NextResponse.json(await getGameState(surface));
  },
);

const createSchema = z.object({ mode: z.enum(["SHARED", "GUESS"]) });

export const POST = withErrors(
  async (
    req: Request,
    { params }: { params: Promise<{ matchId: string }> },
  ) => {
    const user = await requireUser();
    if (!user.isVerified) return jsonError(403, "EMAIL_NOT_VERIFIED");
    const rl = await rateLimit(
      `game:${user.id}`,
      LIMITS.game.limit,
      LIMITS.game.windowMs,
    );
    if (!rl.allowed) return jsonError(429, "RATE_LIMITED");

    const locale = (user.locale ?? "fr") as Locale;
    const surface = await resolveMatchSurface(
      (await params).matchId,
      user.id,
      locale,
    );
    if ("error" in surface) return surface.error;

    const { mode } = createSchema.parse(await readJsonLimited(req));
    const { view } = await createRound(surface, mode);
    return NextResponse.json({ round: view }, { status: 201 });
  },
);
