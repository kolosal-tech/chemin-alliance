import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withErrors, readJsonLimited } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";
import { requireMatchMember } from "@/lib/alliance";
import { encryptField } from "@/lib/security/crypto";

const schema = z.object({ message: z.string().min(1).max(1000) });

/** Sortie relationnelle élégante : clôture digne + dernier message respectueux. */
export const POST = withErrors(
  async (
    req: Request,
    { params }: { params: Promise<{ matchId: string }> },
  ) => {
    const user = await requireUser();
    const match = await requireMatchMember((await params).matchId, user.id);
    // Déjà clôturé (ex: l'autre a clos entre-temps) : idempotent, ne réécrit rien.
    if (match.status === "CLOSED") {
      return NextResponse.json({ ok: true, closed: true });
    }
    const { message } = schema.parse(await readJsonLimited(req));

    await prisma.$transaction([
      prisma.message.create({
        data: {
          matchId: match.id,
          senderId: user.id,
          contentEncrypted: encryptField(message),
        },
      }),
      prisma.match.update({
        where: { id: match.id },
        data: {
          stage: "CLOSED",
          status: "CLOSED",
          closedBy: user.id,
          closeMessage: null,
        },
      }),
    ]);
    return NextResponse.json({ ok: true, closed: true });
  },
);
