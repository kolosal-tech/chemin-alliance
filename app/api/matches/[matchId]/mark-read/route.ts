import { NextResponse } from "next/server";
import { withErrors } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";
import { requireMatchMember } from "@/lib/alliance";
import { markMatchAsRead } from "@/lib/unread";

// Marque la conversation comme lue pour l'utilisateur courant.
export const POST = withErrors(
  async (_req: Request, { params }: { params: { matchId: string } }) => {
    const user = await requireUser();
    await requireMatchMember(params.matchId, user.id);
    await markMatchAsRead(params.matchId, user.id);
    return NextResponse.json({ ok: true });
  },
);
