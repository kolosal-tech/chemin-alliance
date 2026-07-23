import { after, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  clientIp,
  jsonError,
  readJsonLimited,
  withErrors,
} from "@/lib/api-helpers";
import { hashPassword } from "@/lib/security/password";
import { rateLimit, LIMITS } from "@/lib/security/rate-limit";
import { sendVerificationEmail } from "@/lib/email";
import { EMAIL_VERIFY_TTL_MS } from "@/lib/auth/email-verification";
import { SENSITIVE_DATA_CONSENT } from "@/lib/sensitive-data-consent-scope";
import { TERMS_OF_SERVICE_CONSENT } from "@/lib/legal/consent-scope";

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
  // Pays obligatoire : minimum d'info géographique pour le matching + la locale.
  country: z.string().trim().min(2).max(80),
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

  const body = schema.parse(await readJsonLimited(req));
  // Travail coûteux exécuté dans les deux cas (adresse nouvelle ou existante)
  // afin de ne pas créer un oracle temporel trivial sur Argon2.
  const passwordHash = await hashPassword(body.password);
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

  let user: { email: string } | null = null;
  try {
    user = await prisma.user.create({
      data: {
        email: body.email,
        passwordHash,
        displayName: body.displayName,
        age: body.age,
        gender: body.gender,
        country: body.country,
        locale: body.locale,
        rulesetId,
        season,
        emailVerifyToken: token,
        // Le lien d'inscription expire après EMAIL_VERIFY_TTL_MS (7 j). 24 h
        // était trop court quand l'email tombait en spam.
        emailVerifyExpires: new Date(Date.now() + EMAIL_VERIFY_TTL_MS),
        faithProfile: { create: { vertical: body.vertical } },
        relationshipProfile: {
          create: { maritalStatus },
        },
        privacySettings: { create: {} },
        consents: {
          createMany: {
            data: [SENSITIVE_DATA_CONSENT, TERMS_OF_SERVICE_CONSENT],
          },
        },
      },
      select: { email: true },
    });
  } catch (error) {
    if (
      !(
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      )
    ) {
      throw error;
    }
    // Même statut et même corps qu'une création réussie : ni l'adresse
    // existante ni une course concurrente ne deviennent énumérables.
  }

  // Toujours planifié, même si l'adresse existe : le chemin synchrone et le
  // coût d'ordonnancement restent identiques. Aucun email n'est envoyé dans ce
  // cas, afin de ne pas permettre à un tiers de déclencher du spam.
  after(async () => {
    if (user) {
      try {
        const delivered = await sendVerificationEmail(
          user.email,
          token,
          body.locale,
        );
        if (!delivered) {
          console.error("[register] envoi de vérification refusé");
        }
      } catch {
        console.error("[register] envoi de vérification échoué");
      }
    }
  });
  return NextResponse.json({ ok: true }, { status: 201 });
});
