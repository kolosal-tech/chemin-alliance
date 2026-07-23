import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, withErrors } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";
import { rateLimit, LIMITS } from "@/lib/security/rate-limit";
import { accessibleConversationWhere } from "@/lib/blocks";

/**
 * Supprimer SON propre message (corriger une erreur de saisie).
 * Garde-fous : on doit être membre de la conversation ET être l'expéditeur
 * du message. Suppression réelle - le modèle Message n'a aucune FK entrante,
 * donc rien à orpheliner.
 */
export const DELETE = withErrors(
  async (
    _req: Request,
    { params }: { params: Promise<{ matchId: string; messageId: string }> },
  ) => {
    const user = await requireUser();
    const rl = await rateLimit(
      `msg-del:${user.id}`,
      LIMITS.message.limit,
      LIMITS.message.windowMs,
    );
    if (!rl.allowed) return jsonError(429, "RATE_LIMITED");

    const { matchId, messageId } = await params;
    // Suppression conditionnelle en une seule requête : le message doit être
    // le sien, dans ce fil précis, encore ouvert et sans blocage dans la paire.
    const deleted = await prisma.message.deleteMany({
      where: {
        id: messageId,
        matchId,
        senderId: user.id,
        match: {
          is: accessibleConversationWhere(matchId, user.id),
        },
      },
    });
    if (deleted.count !== 1) {
      return jsonError(404, "NOT_FOUND");
    }

    return NextResponse.json({ ok: true });
  },
);
