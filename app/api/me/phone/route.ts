import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, readJsonLimited, withErrors } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";
import { rateLimit } from "@/lib/security/rate-limit";
import {
  generateCode,
  hashCode,
  smsEnabled,
  startVerification,
  checkVerification,
} from "@/lib/sms";

// Vérification du numéro de téléphone - GRATUITE (anti-bot).
// Prod : Twilio Verify (code + envoi + livraison mondiale gérés par Twilio).
// Repli dev (Twilio non configuré) : code auto-géré à 6 chiffres, haché,
// expirant en 10 min, 5 tentatives max, loggé côté serveur.

const CODE_TTL_MS = 10 * 60_000;
const MAX_ATTEMPTS = 5;

const startSchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(
      /^\+[1-9]\d{6,14}$/,
      "Numéro international requis (ex. +2250700000000)",
    ),
});
const verifySchema = z.object({ code: z.string().regex(/^\d{6}$/) });

/** GET : état de vérification du numéro. */
export const GET = withErrors(async () => {
  const user = await requireUser();
  const me = await prisma.user.findUnique({
    where: { id: user.id },
    select: { phone: true, phoneVerified: true },
  });
  return NextResponse.json({
    phone: me?.phone ?? null,
    verified: me?.phoneVerified ?? false,
    smsConfigured: smsEnabled(),
  });
});

/** POST : enregistre le numéro (non vérifié) et déclenche l'envoi du code. */
export const POST = withErrors(async (req: Request) => {
  const user = await requireUser();
  if (!smsEnabled() && process.env.NODE_ENV === "production") {
    return jsonError(503, "SMS_UNAVAILABLE");
  }
  const rl = await rateLimit(`phone-start:${user.id}`, 5, 60 * 60_000);
  if (!rl.allowed) return jsonError(429, "RATE_LIMITED");
  const { phone } = startSchema.parse(await readJsonLimited(req));

  await prisma.user.update({
    where: { id: user.id },
    data: { phone, phoneVerified: false },
  });

  if (smsEnabled()) {
    // Twilio Verify génère et envoie le code lui-même. S'il REFUSE l'envoi
    // (numéro hors geo-permissions Twilio, compte encore en trial, solde
    // épuisé...), startVerification renvoie false : on remonte un 502 au lieu
    // de répondre « sent: true ». Sinon l'utilisateur passe à l'écran « saisis
    // le code » pour un SMS qui n'est jamais parti = « ça ne marche plus ».
    const started = await startVerification(phone);
    if (!started) return jsonError(502, "SMS_SEND_FAILED");
  } else {
    // Repli dev : code auto-géré, stocké haché, loggé côté serveur.
    const code = generateCode();
    await prisma.$transaction([
      prisma.phoneVerification.deleteMany({ where: { userId: user.id } }),
      prisma.phoneVerification.create({
        data: {
          userId: user.id,
          codeHash: hashCode(code),
          expiresAt: new Date(Date.now() + CODE_TTL_MS),
        },
      }),
    ]);
    // Garde explicite : ce code ne doit JAMAIS atterrir dans des logs de prod
    // (Vercel logs, drains...), même si `smsEnabled()` était mal configuré.
    if (process.env.NODE_ENV !== "production") {
      console.info(`\n[sms dev - non envoyé] ${phone} code: ${code}\n`);
    }
  }

  return NextResponse.json({ sent: true, smsConfigured: smsEnabled() });
});

/** PATCH : valide le code -> marque le numéro vérifié. */
export const PATCH = withErrors(async (req: Request) => {
  const user = await requireUser();
  if (!smsEnabled() && process.env.NODE_ENV === "production") {
    return jsonError(503, "SMS_UNAVAILABLE");
  }
  const rl = await rateLimit(`phone-verify:${user.id}`, 10, 60 * 60_000);
  if (!rl.allowed) return jsonError(429, "RATE_LIMITED");
  const { code } = verifySchema.parse(await readJsonLimited(req));

  if (smsEnabled()) {
    // Vérification déléguée à Twilio Verify.
    const me = await prisma.user.findUnique({
      where: { id: user.id },
      select: { phone: true },
    });
    if (!me?.phone) return jsonError(400, "NO_PHONE");
    const ok = await checkVerification(me.phone, code);
    if (!ok) return jsonError(400, "CODE_INVALID");
    await prisma.user.update({
      where: { id: user.id },
      data: { phoneVerified: true },
    });
    return NextResponse.json({ verified: true });
  }

  // Repli dev : validation du code auto-géré.
  const pv = await prisma.phoneVerification.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  if (!pv || pv.expiresAt < new Date()) {
    return jsonError(400, "CODE_EXPIRED");
  }
  if (pv.attempts >= MAX_ATTEMPTS) {
    return jsonError(429, "TOO_MANY_ATTEMPTS");
  }
  if (pv.codeHash !== hashCode(code)) {
    await prisma.phoneVerification.update({
      where: { id: pv.id },
      data: { attempts: { increment: 1 } },
    });
    return jsonError(400, "CODE_INVALID");
  }
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { phoneVerified: true },
    }),
    prisma.phoneVerification.deleteMany({ where: { userId: user.id } }),
  ]);
  return NextResponse.json({ verified: true });
});
