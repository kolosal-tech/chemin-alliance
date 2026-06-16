import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { clientIp, jsonError, withErrors } from "@/lib/api-helpers";
import { rateLimit, LIMITS } from "@/lib/security/rate-limit";
import { sendPasswordResetEmail } from "@/lib/email";
import type { Locale } from "@/lib/core-engine";

const schema = z.object({ email: z.string().email().toLowerCase() });

/**
 * Demande de réinitialisation. Réponse TOUJOURS identique (ok) que le compte
 * existe ou non : aucune énumération d'adresses possible.
 */
export const POST = withErrors(async (req: Request) => {
  const rl = await rateLimit(
    `forgot:${clientIp(req)}`,
    LIMITS.passwordReset.limit,
    LIMITS.passwordReset.windowMs,
  );
  if (!rl.allowed) return jsonError(429, "RATE_LIMITED");

  const { email } = schema.parse(await req.json());
  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    const token = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60_000); // 1 h
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken: token, passwordResetExpires: expires },
    });
    await sendPasswordResetEmail(
      user.email,
      token,
      (user.locale ?? "fr") as Locale,
    );
  }
  return NextResponse.json({ ok: true });
});
