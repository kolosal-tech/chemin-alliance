import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, withErrors } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";

// Passer un profil — GRATUIT À VIE, exclusion unilatérale des suggestions,
// aucune raison demandée (doctrine, lib/payments/entitlements -> "pass_user").

const schema = z.object({ targetUserId: z.string().min(1).max(64) });

/** Profils que j'ai passés. */
export const GET = withErrors(async () => {
  const user = await requireUser();
  const passes = await prisma.pass.findMany({
    where: { passerId: user.id },
    orderBy: { createdAt: "desc" },
    include: { passed: { select: { id: true, displayName: true } } },
  });
  return NextResponse.json(
    passes.map((p) => ({
      id: p.passed.id,
      displayName: p.passed.displayName,
      createdAt: p.createdAt,
    })),
  );
});

/** Passer une personne (idempotent). */
export const POST = withErrors(async (req: Request) => {
  const user = await requireUser();
  const { targetUserId } = schema.parse(await req.json());
  if (targetUserId === user.id) return jsonError(400, "CANNOT_PASS_SELF");
  await prisma.pass.upsert({
    where: {
      passerId_passedId: { passerId: user.id, passedId: targetUserId },
    },
    create: { passerId: user.id, passedId: targetUserId },
    update: {},
  });
  return NextResponse.json({ ok: true, passed: true });
});

/** Annuler un passage. */
export const DELETE = withErrors(async (req: Request) => {
  const user = await requireUser();
  const { targetUserId } = schema.parse(await req.json());
  await prisma.pass.deleteMany({
    where: { passerId: user.id, passedId: targetUserId },
  });
  return NextResponse.json({ ok: true, passed: false });
});
