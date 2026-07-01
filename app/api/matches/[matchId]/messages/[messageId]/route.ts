import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, withErrors } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";
import { requireMatchMember } from "@/lib/alliance";
import { rateLimit, LIMITS } from "@/lib/security/rate-limit";

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
    // Vérifie l'appartenance à la conversation (404/403 sinon).
    await requireMatchMember(matchId, user.id);

    const msg = await prisma.message.findUnique({
      where: { id: messageId },
      select: { id: true, matchId: true, senderId: true },
    });
    // On n'efface que SON message, et seulement dans CETTE conversation.
    if (!msg || msg.matchId !== matchId || msg.senderId !== user.id) {
      return jsonError(404, "NOT_FOUND");
    }

    await prisma.message.delete({ where: { id: msg.id } });
    return NextResponse.json({ ok: true });
  },
);
