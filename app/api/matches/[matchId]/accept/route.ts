import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrors } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";
import { requireMatchMember } from "@/lib/alliance";

export const POST = withErrors(
  async (_req: Request, { params }: { params: { matchId: string } }) => {
    const user = await requireUser();
    const match = await requireMatchMember(params.matchId, user.id);
    if (match.status === "PENDING") {
      await prisma.match.update({
        where: { id: match.id },
        data: { status: "ACTIVE" },
      });
    }
    return NextResponse.json({ ok: true });
  },
);
