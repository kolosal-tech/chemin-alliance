import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, readJsonLimited, withErrors } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";
import { rateLimit } from "@/lib/security/rate-limit";
import { encryptField, decryptField } from "@/lib/security/crypto";
import { consentingCoupleSpaceMemberWhere } from "@/lib/sensitive-data-consent";

export const runtime = "nodejs";

/**
 * Messagerie privée entre les deux conjoints d'un Espace Couple ACTIF.
 * Conversation entre époux → PAS de modération (contrairement à la messagerie
 * de matching). Contenu chiffré au repos. L'accès exige un espace ACTIF dont les
 * DEUX membres sont liés (userBId non nul).
 */
async function activeSpace(userId: string) {
  return prisma.coupleSpace.findFirst({
    where: {
      AND: [consentingCoupleSpaceMemberWhere(userId)],
      status: "ACTIVE",
      userBId: { not: null },
    },
    select: { id: true },
  });
}

export const GET = withErrors(async () => {
  const user = await requireUser();
  const space = await activeSpace(user.id);
  if (!space) return NextResponse.json({ messages: [] });
  const rows = await prisma.coupleMessage.findMany({
    where: { spaceId: space.id },
    orderBy: { createdAt: "asc" },
    take: 200,
  });
  return NextResponse.json({
    messages: rows.map((m) => ({
      id: m.id,
      mine: m.senderId === user.id,
      content: decryptField(m.contentEncrypted),
      createdAt: m.createdAt,
    })),
  });
});

const sendSchema = z.object({ content: z.string().trim().min(1).max(2000) });

export const POST = withErrors(async (req: Request) => {
  const user = await requireUser();
  const space = await activeSpace(user.id);
  if (!space) return jsonError(404, "NO_SPACE");
  const rl = await rateLimit(`couplemsg:${user.id}`, 120, 60 * 60_000);
  if (!rl.allowed) return jsonError(429, "RATE_LIMITED");
  const { content } = sendSchema.parse(await readJsonLimited(req));
  const msg = await prisma.coupleMessage.create({
    data: {
      spaceId: space.id,
      senderId: user.id,
      contentEncrypted: encryptField(content),
    },
  });
  return NextResponse.json({ id: msg.id, createdAt: msg.createdAt });
});
