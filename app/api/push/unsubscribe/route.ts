import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withErrors } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";

export const runtime = "nodejs";

const schema = z.object({ endpoint: z.string().url().max(1024) });

// Supprime l'abonnement du device courant. Scope userId : on ne supprime
// jamais l'abonnement d'un autre utilisateur même si l'endpoint est connu.
export const POST = withErrors(async (req: Request) => {
  const user = await requireUser();
  const { endpoint } = schema.parse(await req.json());
  await prisma.pushSubscription.deleteMany({
    where: { endpoint, userId: user.id },
  });
  return NextResponse.json({ ok: true });
});
