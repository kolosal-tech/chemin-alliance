import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withErrors } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";
import { encryptField } from "@/lib/security/crypto";

const visibility = z.enum([
  "PUBLIC_CONTROLLED", "AFTER_MATCH", "AFTER_DIALOGUE",
  "AFTER_DISCERNMENT", "COACH_ONLY", "PRIVATE", "MANUAL_SHARE",
]);

const schema = z.object({
  denomination: z.string().max(80).nullable().optional(),
  ministry: z.string().max(120).nullable().optional(),
  engagementFrequency: z.string().max(60).nullable().optional(),
  localChurch: z.string().max(160).nullable().optional(),
  localChurchVisibility: visibility.optional(),
  testimony: z.string().max(4000).nullable().optional(),
  testimonyVisibility: visibility.optional(),
});

export const PATCH = withErrors(async (req: Request) => {
  const user = await requireUser();
  const body = schema.parse(await req.json());
  const { localChurch, testimony, ...rest } = body;
  await prisma.faithProfile.update({
    where: { userId: user.id },
    data: {
      ...rest,
      ...(localChurch !== undefined && {
        localChurchEncrypted: localChurch ? encryptField(localChurch) : null,
      }),
      ...(testimony !== undefined && {
        testimonyEncrypted: testimony ? encryptField(testimony) : null,
      }),
    },
  });
  return NextResponse.json({ ok: true });
});
