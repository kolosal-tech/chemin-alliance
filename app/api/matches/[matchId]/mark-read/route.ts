import { NextResponse } from "next/server";
import { withErrors } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";
import { requireActiveMatchMember } from "@/lib/alliance";
import { markMatchAsRead } from "@/lib/unread";

// Marque la conversation comme lue pour l'utilisateur courant.
export const POST = withErrors(
  async (
    _req: Request,
    { params }: { params: Promise<{ matchId: string }> },
  ) => {
    const user = await requireUser();
    const { matchId } = await params;
    await requireActiveMatchMember(matchId, user.id);
    await markMatchAsRead(matchId, user.id);
    return NextResponse.json({ ok: true });
  },
);
