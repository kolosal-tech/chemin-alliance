import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withErrors } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";
import { encryptField } from "@/lib/security/crypto";

const visibility = z.enum([
  "PUBLIC_CONTROLLED",
  "AFTER_MATCH",
  "AFTER_DIALOGUE",
  "AFTER_DISCERNMENT",
  "COACH_ONLY",
  "PRIVATE",
  "MANUAL_SHARE",
]);

const schema = z.object({
  maritalStatus: z
    .enum(["single", "widowed", "divorced", "single_parent"])
    .optional(),
  hasChildren: z.boolean().optional(),
  childrenVisibility: visibility.optional(),
  wantsChildren: z.boolean().nullable().optional(),
  acceptsChildren: z.boolean().nullable().optional(),
  familyVision: z.string().max(2000).nullable().optional(),
  familyVisionVisibility: visibility.optional(),
  intentionStatement: z.string().max(280).nullable().optional(),
  intentionVisibility: visibility.optional(),
  interests: z.string().max(500).nullable().optional(),
  personality: z.string().max(500).nullable().optional(),
  aspirations: z.string().max(500).nullable().optional(),
});

export const PATCH = withErrors(async (req: Request) => {
  const user = await requireUser();
  const body = schema.parse(await req.json());
  const { familyVision, ...rest } = body;
  const data = {
    ...rest,
    ...(familyVision !== undefined && {
      familyVisionEncrypted: familyVision ? encryptField(familyVision) : null,
    }),
  };
  // upsert (et non update) : certains comptes anciens n'ont pas encore de ligne
  // RelationshipProfile (créée à l'inscription seulement depuis un correctif
  // ultérieur) — un update lèverait P2025 et l'enregistrement du profil échouait.
  await prisma.relationshipProfile.upsert({
    where: { userId: user.id },
    update: data,
    create: { userId: user.id, maritalStatus: "single", ...data },
  });
  return NextResponse.json({ ok: true });
});
