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

  const target = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!target) return jsonError(404, "NOT_FOUND");

  const [a, b] = [user.id, targetUserId].sort();
  const existing = await prisma.match.findUnique({
    where: { userAId_userBId: { userAId: a, userBId: b } },
  });
  if (existing) return jsonError(409, "MATCH_EXISTS");

  const match = await prisma.match.create({
    data: { userAId: a, userBId: b, status: "PENDING" },
  });
  return NextResponse.json({ ok: true, matchId: match.id }, { status: 201 });
});
