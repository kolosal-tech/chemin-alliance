import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, withErrors } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";

/** Confirmation du mariage par le second membre (espace issu d'un match). */
export const POST = withErrors(async () => {
  const user = await requireUser();
  const space = await prisma.coupleSpace.findFirst({
    where: { userBId: user.id, status: "PENDING" },
  });
  if (!space) return jsonError(404, "NO_PENDING_SPACE");

  const ops = [
    prisma.coupleSpace.update({
      where: { id: space.id },
      data: { status: "ACTIVE", marriedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: space.userAId },
      data: { season: "MARRIED" },
    }),
    prisma.user.update({ where: { id: user.id }, data: { season: "MARRIED" } }),
    prisma.relationshipProfile.update({
      where: { userId: space.userAId },
      data: { maritalStatus: "married" },
    }),
    prisma.relationshipProfile.update({
      where: { userId: user.id },
      data: { maritalStatus: "married" },
    }),
  ];
  if (space.matchId) {
    // Le chemin de rencontre se termine en beauté : le match se clôt.
    ops.push(
      prisma.match.update({
        where: { id: space.matchId },
        data: { stage: "CLOSED", status: "CLOSED" },
      }) as never,
    );
  }
  await prisma.$transaction(ops);
  return NextResponse.json({ ok: true });
});
