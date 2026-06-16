import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { jsonError, withErrors } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";
import { rateLimit, LIMITS } from "@/lib/security/rate-limit";
import { sendVerificationEmail } from "@/lib/email";
import type { Locale } from "@/lib/core-engine";

/** Renvoie l'email de vérification au membre connecté non encore vérifié. */
export const POST = withErrors(async () => {
  const user = await requireUser();
  if (user.isVerified) {
    return NextResponse.json({ ok: true, alreadyVerified: true });
  }
  const rl = await rateLimit(
    `resend-verify:${user.id}`,
    LIMITS.auth.limit,
    LIMITS.auth.windowMs,
  );
  if (!rl.allowed) return jsonError(429, "RATE_LIMITED");

  const token = user.emailVerifyToken ?? randomBytes(32).toString("hex");
  if (!user.emailVerifyToken) {
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerifyToken: token },
    });
  }
  await sendVerificationEmail(user.email, token, (user.locale ?? "fr") as Locale);
  return NextResponse.json({ ok: true });
});
