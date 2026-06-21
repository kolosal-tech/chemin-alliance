import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withErrors, readJsonLimited } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";

const schema = z.object({
  antiMalaiseEnabled: z.boolean().optional(),
  antiMalaiseRadiusKm: z.number().int().min(5).max(200).optional(),
  invisibleMode: z.boolean().optional(),
  fieldVisibility: z.record(z.string(), z.string()).optional(),
});

export const PATCH = withErrors(async (req: Request) => {
  const user = await requireUser();
  const body = schema.parse(await readJsonLimited(req));
  await prisma.privacySettings.update({
    where: { userId: user.id },
    data: body,
  });
  return NextResponse.json({ ok: true });
});
