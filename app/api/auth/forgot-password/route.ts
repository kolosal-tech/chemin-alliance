import { after, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  clientIp,
  jsonError,
  readJsonLimited,
  withErrors,
} from "@/lib/api-helpers";
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

  const { email } = schema.parse(await readJsonLimited(req));
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 60 * 60_000); // 1 h
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, locale: true },
  });

  // Même type et même nombre de requêtes DB pour une adresse connue ou non.
  // updateMany évite une exception lorsque l'identifiant sentinelle n'existe
  // pas et réduit l'oracle temporel sans créer de ligne factice.
  await prisma.user.updateMany({
    where: { id: user?.id ?? "__password_reset_unknown_account__" },
    data: { passwordResetToken: token, passwordResetExpires: expires },
  });

  // Toujours planifié : même coût d'ordonnancement pour compte connu/inconnu.
  // La latence Resend reste hors du temps de réponse observable.
  after(async () => {
    if (user) {
      try {
        await sendPasswordResetEmail(
          user.email,
          token,
          (user.locale ?? "fr") as Locale,
        );
      } catch {
        console.error("[forgot-password] envoi de réinitialisation échoué");
      }
    }
  });
  return NextResponse.json({ ok: true });
});
