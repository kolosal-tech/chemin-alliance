import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, withErrors } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";
import { requireMatchMember } from "@/lib/alliance";

export const POST = withErrors(
  async (_req: Request, { params }: { params: { matchId: string } }) => {
    const user = await requireUser();
    const match = await requireMatchMember(params.matchId, user.id);
    if (match.status === "PENDING") {
      // Consentement mutuel : le demandeur connu ne peut pas s'auto-accepter.
      // Un ancien match sans demandeur (legacy, requestedById null) reste
      // acceptable par l'un ou l'autre membre — sinon il resterait figé.
      if (match.requestedById && match.requestedById === user.id) {
        return jsonError(403, "CANNOT_ACCEPT");
      }
      await prisma.match.update({
        where: { id: match.id },
        data: { status: "ACTIVE" },
      });
    }
    return NextResponse.json({ ok: true });
  },
);
