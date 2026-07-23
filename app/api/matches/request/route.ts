import { NextResponse } from "next/server";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { jsonError, readJsonLimited, withErrors } from "@/lib/api-helpers";
import { createEligibleMatchRequest, MatchRequestError } from "@/lib/matching";
import { requireUser } from "@/lib/security/session";
import { sendPushToUser } from "@/lib/push";
import { newRequestNotification } from "@/lib/push-messages";
import { encryptField } from "@/lib/security/crypto";

// web-push (via lib/push) requiert le runtime Node.
export const runtime = "nodejs";

const schema = z.object({ targetUserId: z.string().min(1) });

export const POST = withErrors(async (req: Request) => {
  const user = await requireUser();
  const { targetUserId } = schema.parse(await readJsonLimited(req));
  if (targetUserId === user.id) return jsonError(400, "INVALID_TARGET");

  let request;
  try {
    request = await createEligibleMatchRequest(user.id, targetUserId);
  } catch (error) {
    if (!(error instanceof MatchRequestError)) throw error;
    switch (error.code) {
      case "INVALID_TARGET":
        return jsonError(400, "INVALID_TARGET");
      case "ACTOR_NOT_ELIGIBLE":
        return jsonError(403, "NOT_IN_MATCHING");
      case "TARGET_NOT_ELIGIBLE":
        // Une cible inexistante, masquée ou devenue inéligible reste
        // indistinguable afin de ne révéler aucune donnée de profil/sûreté.
        return jsonError(404, "NOT_FOUND");
      case "MATCH_EXISTS":
        return jsonError(409, "MATCH_EXISTS");
    }
  }

  // Compagnon IA : pas de reciprocite humaine a attendre. La rencontre s'ouvre
  // immediatement (statut ACTIVE) et le compagnon depose un message d'accueil
  // transparent ("je ne represente pas une personne reelle"). Aucun push (l'IA
  // n'a pas d'appareil). Le client est redirige vers le fil.
  if (request.target.kind === "AI_COMPANION") {
    const tr = await getTranslations({
      locale: user.locale ?? "fr",
      namespace: "discovery_ecosystem",
    });
    await prisma.message.create({
      data: {
        matchId: request.matchId,
        senderId: request.target.id,
        contentEncrypted: encryptField(
          tr("welcome", { name: request.target.displayName }),
        ),
      },
    });
    return NextResponse.json(
      { ok: true, matchId: request.matchId, companion: true },
      { status: 201 },
    );
  }

  // Notification push best-effort à la personne sollicitée (jamais bloquant).
  try {
    await sendPushToUser(
      request.target.id,
      newRequestNotification(request.target.locale),
    );
  } catch {
    console.error("[push] notif demande indisponible");
  }
  return NextResponse.json(
    { ok: true, matchId: request.matchId },
    { status: 201 },
  );
});
