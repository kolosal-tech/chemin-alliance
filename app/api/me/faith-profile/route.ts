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

// Champs libres passes par sensitiveText : normalisation NFC, suppression des
// caracteres de controle/bidi/zero-width, bornage avant+apres nettoyage.
const schema = z.object({
  denomination: sensitiveText(80),
  ministry: sensitiveText(120),
  engagementFrequency: sensitiveText(60),
  localChurch: sensitiveText(160),
  localChurchVisibility: visibility.optional(),
  testimony: sensitiveText(4000),
  testimonyVisibility: visibility.optional(),
});

export const PATCH = withErrors(async (req: Request) => {
  const user = await requireUser();
  const body = schema.parse(await readJsonLimited(req));
  const { localChurch, testimony, ...rest } = body;
  const data = {
    ...rest,
    ...(localChurch !== undefined && {
      localChurchEncrypted: localChurch ? encryptField(localChurch) : null,
    }),
    ...(testimony !== undefined && {
      testimonyEncrypted: testimony ? encryptField(testimony) : null,
    }),
  };
  // upsert (et non update) : un compte sans ligne FaithProfile leverait P2025
  // (record not found), faisant echouer l'enregistrement du profil. `vertical`
  // a une valeur par defaut au niveau du schema Prisma, pas besoin de la fournir.
  await prisma.faithProfile.upsert({
    where: { userId: user.id },
    update: data,
    create: { userId: user.id, ...data },
  });
  return NextResponse.json({ ok: true });
});
