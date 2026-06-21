import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withErrors, readJsonLimited } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";
import { encryptField } from "@/lib/security/crypto";
import { sensitiveText } from "@/lib/security/sensitive-text";

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
  // Doit accepter TOUTES les valeurs que le systeme ecrit : l'inscription
  // (intent fiance/marie) et l'Espace Couple posent "engaged"/"married".
  maritalStatus: z
    .enum([
      "single",
      "widowed",
      "divorced",
      "single_parent",
      "engaged",
      "married",
    ])
    .optional(),
  hasChildren: z.boolean().optional(),
  childrenVisibility: visibility.optional(),
  wantsChildren: z.boolean().nullable().optional(),
  acceptsChildren: z.boolean().nullable().optional(),
  // Champs libres passes par sensitiveText (NFC + anti-controle/bidi + bornage).
  familyVision: sensitiveText(2000),
  familyVisionVisibility: visibility.optional(),
  intentionStatement: sensitiveText(280),
  intentionVisibility: visibility.optional(),
  interests: sensitiveText(500),
  personality: sensitiveText(500),
  aspirations: sensitiveText(500),
});

export const PATCH = withErrors(async (req: Request) => {
  const user = await requireUser();
  const body = schema.parse(await readJsonLimited(req));
  const { familyVision, ...rest } = body;
  const data = {
    ...rest,
    ...(familyVision !== undefined && {
      familyVisionEncrypted: familyVision ? encryptField(familyVision) : null,
    }),
  };
  // upsert (et non update) : certains comptes anciens n'ont pas encore de ligne
  // RelationshipProfile (creee a l'inscription seulement depuis un correctif
  // ulterieur) - un update leverait P2025 et l'enregistrement du profil echouait.
  await prisma.relationshipProfile.upsert({
    where: { userId: user.id },
    update: data,
    create: { userId: user.id, maritalStatus: "single", ...data },
  });
  return NextResponse.json({ ok: true });
});
