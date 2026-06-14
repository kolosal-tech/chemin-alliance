import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, withErrors } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";
import { rateLimit } from "@/lib/security/rate-limit";
import { generateCode, hashCode, sendSms, smsEnabled } from "@/lib/sms";

// Vérification du numéro de téléphone — GRATUITE (anti-bot). Code à 6 chiffres,
// haché, expirant en 10 min, 5 tentatives max. Envoi dormant tant que Twilio
// n'est pas configuré (le code est alors loggé côté serveur).

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

/** POST : enregistre le numéro (non vérifié) et envoie un code. */
export const POST = withErrors(async (req: Request) => {
  const user = await requireUser();
  const rl = await rateLimit(`phone-start:${user.id}`, 5, 60 * 60_000);
  if (!rl.allowed) return jsonError(429, "RATE_LIMITED");
  const { phone } = startSchema.parse(await req.json());

  const code = generateCode();
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { phone, phoneVerified: false },
    }),
    prisma.phoneVerification.deleteMany({ where: { userId: user.id } }),
    prisma.phoneVerification.create({
      data: {
        userId: user.id,
        codeHash: hashCode(code),
        expiresAt: new Date(Date.now() + CODE_TTL_MS),
      },
    }),
  ]);
  await sendSms(phone, `Chemin d'Alliance — code de vérification : ${code}`);
  return NextResponse.json({ sent: true, smsConfigured: smsEnabled() });
});

/** PATCH : valide le code -> marque le numéro vérifié. */
export const PATCH = withErrors(async (req: Request) => {
  const user = await requireUser();
  const rl = await rateLimit(`phone-verify:${user.id}`, 10, 60 * 60_000);
  if (!rl.allowed) return jsonError(429, "RATE_LIMITED");
  const { code } = verifySchema.parse(await req.json());

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
