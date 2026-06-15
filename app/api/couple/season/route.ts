import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, withErrors } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";

const schema = z.object({ season: z.enum(["MARRIED", "PARENTS"]) });

/** Bascule de saison (ex. « un enfant est arrivé ») — pour les deux membres. */
export const PATCH = withErrors(async (req: Request) => {
  const user = await requireUser();
  const { season } = schema.parse(await req.json());
  const space = await prisma.coupleSpace.findFirst({
    where: {
      OR: [{ userAId: user.id }, { userBId: user.id }],
      status: "ACTIVE",
    },
  });
  if (!space) return jsonError(404, "NO_SPACE");
  // Des fiancés ne sautent pas à PARENTS : ils passent d'abord par MARRIED.
  if (space.season === "ENGAGED" && season !== "MARRIED") {
    return jsonError(409, "INVALID_TRANSITION");
  }
  // Cible MARRIED ou PARENTS -> statut marié pour les deux. Sur passage à
  // MARRIED depuis un espace fiancés (marriedAt null), on date le mariage.
  const ops = [
    prisma.coupleSpace.update({
      where: { id: space.id },
      data: {
        season,
        ...(season === "MARRIED" && space.marriedAt == null
          ? { marriedAt: new Date() }
          : {}),
      },
    }),
    prisma.user.update({ where: { id: space.userAId }, data: { season } }),
    prisma.relationshipProfile.update({
      where: { userId: space.userAId },
      data: { maritalStatus: "married" },
    }),
  ];
  if (space.userBId) {
    ops.push(
      prisma.user.update({ where: { id: space.userBId }, data: { season } }),
    );
    ops.push(
      prisma.relationshipProfile.update({
        where: { userId: space.userBId },
        data: { maritalStatus: "married" },
      }),
    );
  }
  await prisma.$transaction(ops);
  return NextResponse.json({ ok: true, season });
});
