import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, readJsonLimited, withErrors } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";
import { rateLimit, LIMITS } from "@/lib/security/rate-limit";

const schema = z.object({
  targetUserId: z.string().min(1),
  reason: z.string().min(10).max(2000),
});

/** Signalement — toujours gratuit, jamais derrière un paywall. */
export const POST = withErrors(async (req: Request) => {
  const user = await requireUser();
  const rl = await rateLimit(
    `report:${user.id}`,
    LIMITS.report.limit,
    LIMITS.report.windowMs,
  );
  if (!rl.allowed) return jsonError(429, "RATE_LIMITED");

  const body = schema.parse(await readJsonLimited(req));
  if (body.targetUserId === user.id) return jsonError(400, "INVALID_TARGET");

  // La cible doit exister (sinon la FK lèverait un 500).
  const target = await prisma.user.findUnique({
    where: { id: body.targetUserId },
  });
  if (!target) return jsonError(404, "NOT_FOUND");

  // Dédup : un seul signalement OUVERT par (signaleur, cible) à la fois —
  // empêche le spam de signalements et le blocage d'avancement par déni.
  const existing = await prisma.report.findFirst({
    where: {
      reporterId: user.id,
      targetUserId: body.targetUserId,
      status: "OPEN",
    },
  });
  if (existing) {
    return NextResponse.json({ ok: true, alreadyReported: true });
  }

  await prisma.report.create({
    data: {
      reporterId: user.id,
      targetUserId: body.targetUserId,
      reason: body.reason,
    },
  });
  return NextResponse.json({ ok: true }, { status: 201 });
});
