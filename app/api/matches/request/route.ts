import { NextResponse } from "next/server";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { jsonError, readJsonLimited, withErrors } from "@/lib/api-helpers";
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
  // Hors matching : seuls les profils JOURNEY ouvrent une rencontre.
  if (user.season !== "JOURNEY") return jsonError(403, "NOT_IN_MATCHING");
  if (!user.isVerified) return jsonError(403, "EMAIL_NOT_VERIFIED");

  const target = await prisma.user.findUnique({ where: { id: targetUserId } });
  // Cible inexistante OU sortie du matching (fiancés/mariés) -> 404 :
  // on ne divulgue pas la saison d'un tiers.
  if (!target || target.season !== "JOURNEY")
    return jsonError(404, "NOT_FOUND");

  const [a, b] = [user.id, targetUserId].sort();
  const existing = await prisma.match.findUnique({
    where: { userAId_userBId: { userAId: a, userBId: b } },
  });
  if (existing) return jsonError(409, "MATCH_EXISTS");

  // Compagnon IA : pas de reciprocite humaine a attendre. La rencontre s'ouvre
  // immediatement (statut ACTIVE) et le compagnon depose un message d'accueil
  // transparent ("je ne represente pas une personne reelle"). Aucun push (l'IA
  // n'a pas d'appareil). Le client est redirige vers le fil.
  if (target.kind === "AI_COMPANION") {
    const match = await prisma.match.create({
      data: { userAId: a, userBId: b, status: "ACTIVE", requestedById: user.id },
    });
    const tr = await getTranslations({
      locale: user.locale ?? "fr",
      namespace: "discovery_ecosystem",
    });
    await prisma.message.create({
      data: {
        matchId: match.id,
        senderId: target.id,
        contentEncrypted: encryptField(
          tr("welcome", { name: target.displayName }),
        ),
      },
    });
    return NextResponse.json(
      { ok: true, matchId: match.id, companion: true },
      { status: 201 },
    );
  }

  const match = await prisma.match.create({
    data: { userAId: a, userBId: b, status: "PENDING", requestedById: user.id },
  });
  // Notification push best-effort à la personne sollicitée (jamais bloquant).
  try {
    await sendPushToUser(targetUserId, newRequestNotification(target.locale));
  } catch (err) {
    console.error("[push] notif demande échouée", err);
  }
  return NextResponse.json({ ok: true, matchId: match.id }, { status: 201 });
});
