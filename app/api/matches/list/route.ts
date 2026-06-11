import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrors } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";

export const GET = withErrors(async () => {
  const user = await requireUser();
  const matches = await prisma.match.findMany({
    where: { OR: [{ userAId: user.id }, { userBId: user.id }] },
    include: {
      userA: { select: { id: true, displayName: true, isVerified: true } },
      userB: { select: { id: true, displayName: true, isVerified: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(
    matches.map((m) => ({
      id: m.id,
      stage: m.stage,
      status: m.status,
      contactExchange: m.contactExchange,
      other: m.userAId === user.id ? m.userB : m.userA,
    })),
  );
});
