import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, withErrors } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";

const schema = z.object({ targetUserId: z.string().min(1) });

export const POST = withErrors(async (req: Request) => {
  const user = await requireUser();
  const { targetUserId } = schema.parse(await req.json());
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

  const match = await prisma.match.create({
    data: { userAId: a, userBId: b, status: "PENDING", requestedById: user.id },
  });
  return NextResponse.json({ ok: true, matchId: match.id }, { status: 201 });
});
