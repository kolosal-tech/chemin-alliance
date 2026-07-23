import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, readJsonLimited, withErrors } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";
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
import { consentingCoupleSpaceMemberWhere } from "@/lib/sensitive-data-consent";

export const runtime = "nodejs";

/**
 * Soumission d'une réponse/devinette pour une manche du jeu (surface COUPLE).
 * Miroir de la surface MATCH : au reveal, poste un CoupleMessage chiffré dans
 * la messagerie privée du couple (via le callback), stocke son id, et notifie
 * l'autre conjoint (push best-effort si disponible).
 */

const schema = z.object({
  answer: z.string().trim().min(1).max(2000).optional(),
  guess: z.string().trim().min(1).max(2000).optional(),
});

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

export const POST = withErrors(
  async (
    req: Request,
    { params }: { params: Promise<{ roundId: string }> },
  ) => {
    const user = await requireUser();
    const rl = await rateLimit(
      `game:${user.id}`,
      LIMITS.game.limit,
      LIMITS.game.windowMs,
    );
    if (!rl.allowed) return jsonError(429, "RATE_LIMITED");

    const space = await activeSpace(user.id);
    if (!space || !space.userBId) return jsonError(404, "NO_SPACE");
    const otherUserId =
      space.userAId === user.id ? space.userBId : space.userAId;

    const locale = (user.locale ?? "fr") as Locale;
    const surface: GameSurface = {
      kind: "couple",
      surfaceId: space.id,
      userId: user.id,
      otherUserId,
      locale,
    };

    const { roundId } = await params;
    const body = schema.parse(await readJsonLimited(req));

    try {
      const result = await submitAnswer(
        surface,
        roundId,
        body,
        // Reveal : poste un CoupleMessage chiffré dans la messagerie du couple.
        async (plaintext) => {
          const msg = await prisma.coupleMessage.create({
            data: {
              spaceId: space.id,
              senderId: user.id,
              contentEncrypted: encryptField(plaintext),
            },
          });
          return msg.id;
        },
      );

      // Push best-effort vers l'autre conjoint (best-effort : les couples n'ont
      // pas forcément d'abonnement push ; sendPushToUser gère l'absence).
      if (result.revealed) {
        try {
          const other = await prisma.user.findUnique({
            where: { id: otherUserId },
            select: { locale: true },
          });
          await sendPushToUser(
            otherUserId,
            gameRevealNotification(other?.locale, { kind: "couple" }),
          );
        } catch {
          console.error("[push] notif reveal jeu couple indisponible");
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
