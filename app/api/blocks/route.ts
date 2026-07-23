import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, readJsonLimited, withErrors } from "@/lib/api-helpers";
import { blockUserAndCloseMatches } from "@/lib/blocks";
import { requireUser } from "@/lib/security/session";

// Blocage user-à-user - GRATUIT À VIE, jamais derrière un paywall, aucune
// raison demandée (doctrine, lib/payments/entitlements -> "block_user").

const schema = z.object({ targetUserId: z.string().min(1).max(64) });

/** Liste des personnes que j'ai bloquées. */
export const GET = withErrors(async () => {
  const user = await requireUser();
  const blocks = await prisma.block.findMany({
    where: { blockerId: user.id },
    orderBy: { createdAt: "desc" },
    include: { blocked: { select: { id: true, displayName: true } } },
  });
  return NextResponse.json(
    blocks.map((b) => ({
      id: b.blocked.id,
      displayName: b.blocked.displayName,
      createdAt: b.createdAt,
    })),
  );
});

/** Bloquer une personne (idempotent). */
export const POST = withErrors(async (req: Request) => {
  const user = await requireUser();
  const { targetUserId } = schema.parse(await readJsonLimited(req));
  if (targetUserId === user.id) return jsonError(400, "CANNOT_BLOCK_SELF");
  await blockUserAndCloseMatches(user.id, targetUserId);
  return NextResponse.json({ ok: true, blocked: true });
});

/** Débloquer une personne. */
export const DELETE = withErrors(async (req: Request) => {
  const user = await requireUser();
  const { targetUserId } = schema.parse(await readJsonLimited(req));
  await prisma.block.deleteMany({
    where: { blockerId: user.id, blockedId: targetUserId },
  });
  return NextResponse.json({ ok: true, blocked: false });
});
