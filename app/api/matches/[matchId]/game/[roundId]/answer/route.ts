import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, readJsonLimited, withErrors } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";
import { requireMatchMember } from "@/lib/alliance";
import { rateLimit, LIMITS } from "@/lib/security/rate-limit";
import { encryptField } from "@/lib/security/crypto";
import { sendPushToUser } from "@/lib/push";
import { gameRevealNotification } from "@/lib/push-messages";
import type { Locale } from "@/lib/core-engine";
import {
  submitAnswer,
  GameValidationError,
  type GameSurface,
} from "@/lib/games/engine";

export const runtime = "nodejs";

/**
 * Soumission d'une réponse/devinette pour une manche du jeu (surface MATCH).
 * L'engine valide mode+rôle, écrit le contenu CHIFFRÉ, et — si la condition de
 * reveal est atteinte — poste un message SYSTÈME chiffré dans le fil du match
 * (via le callback), stocke son id, et notifie l'autre joueur (push best-effort).
 */

const schema = z.object({
  answer: z.string().trim().min(1).max(2000).optional(),
  guess: z.string().trim().min(1).max(2000).optional(),
});

export const POST = withErrors(
  async (
    req: Request,
    { params }: { params: Promise<{ matchId: string; roundId: string }> },
  ) => {
    const user = await requireUser();
    if (!user.isVerified) return jsonError(403, "EMAIL_NOT_VERIFIED");
    const rl = await rateLimit(
      `game:${user.id}`,
      LIMITS.game.limit,
      LIMITS.game.windowMs,
    );
    if (!rl.allowed) return jsonError(429, "RATE_LIMITED");

    const { matchId, roundId } = await params;
    const match = await requireMatchMember(matchId, user.id);
    const otherUserId =
      match.userAId === user.id ? match.userBId : match.userAId;

    // Garde-fou : jeu humain-humain uniquement (pas de Compagnon IA).
    const other = await prisma.user.findUnique({
      where: { id: otherUserId },
      select: { kind: true, locale: true },
    });
    if (other?.kind === "AI_COMPANION") {
      return jsonError(403, "GAME_HUMAN_ONLY");
    }

    const locale = (user.locale ?? "fr") as Locale;
    const surface: GameSurface = {
      kind: "match",
      surfaceId: match.id,
      userId: user.id,
      otherUserId,
      locale,
    };

    const body = schema.parse(await readJsonLimited(req));

    try {
      const result = await submitAnswer(
        surface,
        roundId,
        body,
        // Reveal : poste un message SYSTÈME chiffré dans le fil du match.
        // senderId = initiateur de la manche (auteur logique du récap).
        async (plaintext) => {
          const msg = await prisma.message.create({
            data: {
              matchId: match.id,
              senderId: user.id,
              kind: "SYSTEM",
              contentEncrypted: encryptField(plaintext),
            },
          });
          await prisma.match.update({
            where: { id: match.id },
            data: { updatedAt: new Date() },
          });
          return msg.id;
        },
      );

      // Push best-effort vers l'autre joueur au moment du reveal (jamais bloquant).
      if (result.revealed) {
        try {
          await sendPushToUser(
            otherUserId,
            gameRevealNotification(other?.locale, {
              kind: "match",
              matchId: match.id,
            }),
          );
        } catch (err) {
          console.error("[push] notif reveal jeu échouée", err);
        }
      }

      return NextResponse.json({
        round: result.view,
        revealed: result.revealed,
      });
    } catch (err) {
      if (err instanceof GameValidationError) {
        return jsonError(err.status, err.code);
      }
      throw err;
    }
  },
);
