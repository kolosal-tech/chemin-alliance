import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  clientIp,
  jsonError,
  readJsonLimited,
  withErrors,
} from "@/lib/api-helpers";
import { verifyPasswordOrDummy } from "@/lib/security/password";
import { rateLimit, LIMITS } from "@/lib/security/rate-limit";
import {
  SESSION_COOKIE,
  sessionCookieOptions,
  signSession,
} from "@/lib/security/jwt";

const schema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
});

export const POST = withErrors(async (req: Request) => {
  const rl = await rateLimit(
    `login:${clientIp(req)}`,
    LIMITS.auth.limit,
    LIMITS.auth.windowMs,
  );
  if (!rl.allowed) return jsonError(429, "RATE_LIMITED");

  const body = schema.parse(await readJsonLimited(req));
  const user = await prisma.user.findUnique({ where: { email: body.email } });
  const passwordValid = await verifyPasswordOrDummy(
    user?.passwordHash,
    body.password,
  );
  // Réponse identique email inconnu / mauvais mot de passe (anti-énumération)
  if (!user || user.deletedAt !== null || !passwordValid) {
    return jsonError(401, "INVALID_CREDENTIALS");
  }

  const token = await signSession({
    sub: user.id,
    role: user.role,
    sessionVersion: user.sessionVersion,
  });
  const res = NextResponse.json({ ok: true, locale: user.locale });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return res;
});
