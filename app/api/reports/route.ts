import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withErrors } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";

const schema = z.object({
  targetUserId: z.string().min(1),
  reason: z.string().min(10).max(2000),
});

/** Signalement — toujours gratuit, jamais derrière un paywall. */
export const POST = withErrors(async (req: Request) => {
  const user = await requireUser();
  const body = schema.parse(await req.json());
  await prisma.report.create({
    data: {
      reporterId: user.id,
      targetUserId: body.targetUserId,
      reason: body.reason,
    },
  });
  return NextResponse.json({ ok: true }, { status: 201 });
});
