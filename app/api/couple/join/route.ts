import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, readJsonLimited, withErrors } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";
import { rateLimit, LIMITS } from "@/lib/security/rate-limit";

const schema = z.object({ code: z.string().min(6).max(20) });

/** Le conjoint rejoint l'espace par code d'invitation. */
export const POST = withErrors(async (req: Request) => {
  const user = await requireUser();
  // Anti-brute-force du code ALLIANCE-XXXXXX : plafond ferme PAR UTILISATEUR.
  // On ne mêle PAS l'IP à la clé - sinon chaque IP relance un budget neuf et
  // un attaquant qui tourne ses IP contourne le plafond (cf. couple/invite).
  const rl = await rateLimit(
    `couple-join:${user.id}`,
    LIMITS.coupleJoin.limit,
    LIMITS.coupleJoin.windowMs,
  );
  if (!rl.allowed) return jsonError(429, "RATE_LIMITED");
  const existing = await prisma.coupleSpace.findFirst({
    where: { OR: [{ userAId: user.id }, { userBId: user.id }] },
  });
  if (existing) return jsonError(409, "SPACE_EXISTS");
  const { code } = schema.parse(await readJsonLimited(req));
  const space = await prisma.coupleSpace.findUnique({
    where: { inviteCode: code.trim().toUpperCase() },
  });
  if (!space || space.userBId) return jsonError(404, "CODE_INVALID");
  if (space.userAId === user.id) return jsonError(400, "CODE_OWN");
  // Cohérence de saison : on ne mélange pas fiancés et déjà-mariés.
  if (user.season !== "JOURNEY" && user.season !== space.season) {
    return jsonError(409, "SEASON_MISMATCH");
  }

  const married = space.season === "MARRIED" || space.season === "PARENTS";
  const maritalStatus = space.season === "ENGAGED" ? "engaged" : "married";
  // Rattachement atomique : seul le premier conjoint qui rejoint « gagne » la
  // place (userBId null -> user.id). Un second appel quasi simultané voit
  // count=0 et n'altère AUCUNE saison/statut - pas d'orphelin sorti du matching.
  const claimed = await prisma.$transaction(async (tx) => {
    const res = await tx.coupleSpace.updateMany({
      where: { id: space.id, userBId: null },
      data: {
        userBId: user.id,
        status: "ACTIVE",
        // Ne stampe une date de mariage que pour un espace marié (pas fiancés).
        marriedAt: married ? (space.marriedAt ?? new Date()) : space.marriedAt,
      },
    });
    if (res.count !== 1) return false;
    await tx.user.update({
      where: { id: space.userAId },
      data: { season: space.season },
    });
    await tx.user.update({
      where: { id: user.id },
      data: { season: space.season },
    });
    await tx.relationshipProfile.update({
      where: { userId: space.userAId },
      data: { maritalStatus },
    });
    await tx.relationshipProfile.update({
      where: { userId: user.id },
      data: { maritalStatus },
    });
    return true;
  });
  if (!claimed) return jsonError(404, "CODE_INVALID");
  return NextResponse.json({ ok: true });
});
