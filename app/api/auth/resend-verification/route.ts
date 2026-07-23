import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { jsonError, withErrors } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";
import { rateLimit, LIMITS } from "@/lib/security/rate-limit";
import { sendVerificationEmail } from "@/lib/email";
import { EMAIL_VERIFY_TTL_MS } from "@/lib/auth/email-verification";
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

  // Rotation SYSTÉMATIQUE du token + expiration rafraîchie à chaque renvoi.
  // Avant, on réutilisait `user.emailVerifyToken` tel quel : si ce token avait
  // déjà expiré, le « renvoyer » expédiait un lien tout aussi mort et le clic
  // re-affichait « lien invalide » - la voie de secours ne réparait donc PAS le
  // cas le plus courant. Désormais : nouveau token (l'ancien lien meurt =
  // sécurité) valide EMAIL_VERIFY_TTL_MS.
  const token = randomBytes(32).toString("hex");
  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerifyToken: token,
      emailVerifyExpires: new Date(Date.now() + EMAIL_VERIFY_TTL_MS),
    },
  });
  const delivered = await sendVerificationEmail(
    user.email,
    token,
    (user.locale ?? "fr") as Locale,
  );
  if (!delivered) return jsonError(502, "EMAIL_FAILED");
  return NextResponse.json({ ok: true });
});
