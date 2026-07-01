import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, readJsonLimited, withErrors } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";
import { hashPassword, verifyPassword } from "@/lib/security/password";
import { passwordField } from "@/lib/security/password-validation";
import { rateLimit, LIMITS } from "@/lib/security/rate-limit";
import {
  SESSION_COOKIE,
  sessionCookieOptions,
  signSession,
} from "@/lib/security/jwt";
import { audit } from "@/lib/audit";

const schema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: passwordField,
});

// Changer son mot de passe (authentifié). Révoque TOUTES les sessions existantes
// (incrément de sessionVersion) : les jetons émis avant ce changement — y compris
// une session volée — deviennent invalides. La session COURANTE (l'utilisateur qui
// change volontairement son MDP) est re-signée ci-dessous avec la nouvelle version.
export const POST = withErrors(async (req: Request) => {
  const user = await requireUser();
  const rl = await rateLimit(
    `password-change:${user.id}`,
    LIMITS.passwordChange.limit,
    LIMITS.passwordChange.windowMs,
  );
  if (!rl.allowed) return jsonError(429, "RATE_LIMITED");

  const { currentPassword, newPassword } = schema.parse(
    await readJsonLimited(req),
  );
  if (!(await verifyPassword(user.passwordHash, currentPassword))) {
    return jsonError(400, "INVALID_CREDENTIALS");
  }
  if (await verifyPassword(user.passwordHash, newPassword)) {
    return jsonError(400, "SAME_PASSWORD");
  }
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(newPassword),
      // Révoque les sessions déjà émises (blacklist implicite via getSessionUser).
      sessionVersion: { increment: 1 },
    },
    select: { role: true, sessionVersion: true },
  });
  audit("password.change", user.id);
  // On garde l'utilisateur courant connecté : nouveau jeton avec la version à jour.
  const token = await signSession({
    sub: user.id,
    role: updated.role,
    sessionVersion: updated.sessionVersion,
  });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return res;
});
