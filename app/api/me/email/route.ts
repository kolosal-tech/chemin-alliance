import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, readJsonLimited, withErrors } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";
import { verifyPassword } from "@/lib/security/password";
import { rateLimit, LIMITS } from "@/lib/security/rate-limit";
import { sendVerificationEmail } from "@/lib/email";

const schema = z.object({
  currentPassword: z.string().min(1).max(128),
  newEmail: z.string().email().toLowerCase(),
});

type Locale = "fr" | "en" | "es" | "pt";

// Changer son adresse email (authentifié). Le nouvel email devient primaire
// immédiatement mais NON vérifié : un lien de confirmation est envoyé.
// Anti-énumération : message générique si l'email est déjà pris.
export const POST = withErrors(async (req: Request) => {
  const user = await requireUser();
  const rl = await rateLimit(
    `email-change:${user.id}`,
    LIMITS.emailChange.limit,
    LIMITS.emailChange.windowMs,
  );
  if (!rl.allowed) return jsonError(429, "RATE_LIMITED");

  const { currentPassword, newEmail } = schema.parse(
    await readJsonLimited(req),
  );
  if (!(await verifyPassword(user.passwordHash, currentPassword))) {
    return jsonError(400, "INVALID_CREDENTIALS");
  }
  if (newEmail === user.email) return jsonError(400, "SAME_EMAIL");

  const existing = await prisma.user.findUnique({ where: { email: newEmail } });
  if (existing) return jsonError(409, "EMAIL_TAKEN");

  const token = randomBytes(32).toString("hex");
  await prisma.user.update({
    where: { id: user.id },
    data: {
      email: newEmail,
      isVerified: false,
      emailVerifyToken: token,
      emailVerifyExpires: new Date(Date.now() + 24 * 60 * 60_000),
    },
  });
  await sendVerificationEmail(newEmail, token, (user.locale as Locale) ?? "fr");
  return NextResponse.json({ ok: true });
});
