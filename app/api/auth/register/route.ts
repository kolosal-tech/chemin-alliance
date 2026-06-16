import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { clientIp, jsonError, withErrors } from "@/lib/api-helpers";
import { hashPassword } from "@/lib/security/password";
import { rateLimit, LIMITS } from "@/lib/security/rate-limit";
import { sendVerificationEmail } from "@/lib/email";

const schema = z.object({
  email: z.string().email().toLowerCase(),
  password: z
    .string()
    .min(12)
    .max(128)
    // Complexité minimale : au moins une minuscule, une majuscule et un chiffre.
    // Rejette les mots de passe faibles type "123456789012".
    .regex(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  displayName: z.string().min(2).max(40),
  age: z.number().int().min(18).max(110),
  gender: z.enum(["F", "M"]),
  vertical: z.enum(["CHRISTIAN_EVANGELICAL", "CHRISTIAN_CATHOLIC"]),
  // "discern" = célibataire en chemin vers le mariage (matching) ;
  // "engaged" = déjà fiancé·e -> Espace Fiancés (préparation), hors matching ;
  // "married" = déjà marié·e -> Espace Couple, jamais dans le matching.
  intent: z.enum(["discern", "engaged", "married"]).default("discern"),
  country: z.string().max(80).optional(),
  locale: z.enum(["fr", "en", "es", "pt"]).default("fr"),
  consentSensitiveData: z.literal(true),
  consentTerms: z.literal(true),
});

export const POST = withErrors(async (req: Request) => {
  const rl = await rateLimit(
    `register:${clientIp(req)}`,
    LIMITS.auth.limit,
    LIMITS.auth.windowMs,
  );
  if (!rl.allowed) return jsonError(429, "RATE_LIMITED");

  const body = schema.parse(await req.json());

  const existing = await prisma.user.findUnique({
    where: { email: body.email },
  });
  if (existing) return jsonError(409, "EMAIL_TAKEN");

  const token = randomBytes(32).toString("hex");
  const rulesetId =
    body.vertical === "CHRISTIAN_CATHOLIC"
      ? "christian_catholic_default"
      : "christian_evangelical_default";

  // Saison & statut selon l'intention. ENGAGED et MARRIED sont hors matching.
  const season =
    body.intent === "married"
      ? "MARRIED"
      : body.intent === "engaged"
        ? "ENGAGED"
        : "JOURNEY";
  const maritalStatus =
    body.intent === "married"
      ? "married"
      : body.intent === "engaged"
        ? "engaged"
        : "single";

  const user = await prisma.user.create({
    data: {
      email: body.email,
      passwordHash: await hashPassword(body.password),
      displayName: body.displayName,
      age: body.age,
      gender: body.gender,
      country: body.country || null,
      locale: body.locale,
      rulesetId,
      season,
      emailVerifyToken: token,
      faithProfile: { create: { vertical: body.vertical } },
      relationshipProfile: {
        create: { maritalStatus },
      },
      privacySettings: { create: {} },
      consents: {
        createMany: {
          data: [
            { type: "SENSITIVE_DATA_PROCESSING" },
            { type: "TERMS_OF_SERVICE" },
          ],
        },
      },
    },
    select: { id: true, email: true },
  });

  await sendVerificationEmail(user.email, token, body.locale);
  return NextResponse.json({ ok: true, userId: user.id }, { status: 201 });
});
