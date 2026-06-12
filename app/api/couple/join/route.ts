import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, withErrors } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";

const schema = z.object({ code: z.string().min(6).max(20) });

/** Le conjoint rejoint l'espace par code d'invitation. */
export const POST = withErrors(async (req: Request) => {
  const user = await requireUser();
  const existing = await prisma.coupleSpace.findFirst({
    where: { OR: [{ userAId: user.id }, { userBId: user.id }] },
  });
  if (existing) return jsonError(409, "SPACE_EXISTS");
  const { code } = schema.parse(await req.json());
  const space = await prisma.coupleSpace.findUnique({
    where: { inviteCode: code.trim().toUpperCase() },
  });
  if (!space || space.userBId) return jsonError(404, "CODE_INVALID");
  if (space.userAId === user.id) return jsonError(400, "CODE_OWN");

  await prisma.$transaction([
    prisma.coupleSpace.update({
      where: { id: space.id },
      data: { userBId: user.id, status: "ACTIVE", marriedAt: space.marriedAt ?? new Date() },
    }),
    prisma.user.update({ where: { id: space.userAId }, data: { season: space.season } }),
    prisma.user.update({ where: { id: user.id }, data: { season: space.season } }),
  ]);
  return NextResponse.json({ ok: true });
});
