import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { clientIp, jsonError, withErrors } from "@/lib/api-helpers";
import { rateLimit } from "@/lib/security/rate-limit";
import { statusForDecision } from "@/lib/sponsor";
import { encryptField } from "@/lib/security/crypto";

export const runtime = "nodejs";

// Page magique du Parrain/Marraine — authentifiée PAR LE TOKEN (pas de session).
// Ne révèle que le prénom du filleul·e (qui l'a choisi) ; aucune donnée de
// l'autre partie du match.
export const GET = withErrors(
  async (_req: Request, { params }: { params: { token: string } }) => {
    const b = await prisma.blessing.findUnique({
      where: { token: params.token },
      include: {
        sponsor: { include: { user: { select: { displayName: true } } } },
      },
    });
    if (!b) return jsonError(404, "NOT_FOUND");
    return NextResponse.json({
      filleulName: b.sponsor.user.displayName,
      sponsorName: b.sponsor.name,
      status: b.status,
    });
  },
);

const schema = z.object({
  decision: z.enum(["bless", "caution"]),
  note: z.string().max(500).optional(),
});

export const POST = withErrors(
  async (req: Request, { params }: { params: { token: string } }) => {
    const rl = await rateLimit(`blessing-respond:${clientIp(req)}`, 20, 60_000);
    if (!rl.allowed) return jsonError(429, "RATE_LIMITED");

    const { decision, note } = schema.parse(await req.json());
    const b = await prisma.blessing.findUnique({
      where: { token: params.token },
    });
    if (!b) return jsonError(404, "NOT_FOUND");
    if (b.status !== "PENDING") return jsonError(409, "ALREADY_ANSWERED");

    await prisma.blessing.update({
      where: { id: b.id },
      data: {
        status: statusForDecision(decision),
        noteEncrypted: note ? encryptField(note) : null,
        respondedAt: new Date(),
      },
    });
    return NextResponse.json({ ok: true });
  },
);
