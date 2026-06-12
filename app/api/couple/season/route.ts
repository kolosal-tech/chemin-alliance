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
  const ops = [
    prisma.coupleSpace.update({ where: { id: space.id }, data: { season } }),
    prisma.user.update({ where: { id: space.userAId }, data: { season } }),
  ];
  if (space.userBId) {
    ops.push(
      prisma.user.update({ where: { id: space.userBId }, data: { season } }),
    );
  }
  await prisma.$transaction(ops);
  return NextResponse.json({ ok: true, season });
});
