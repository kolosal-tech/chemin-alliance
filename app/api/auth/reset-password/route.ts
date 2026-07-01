import { NextResponse } from "next/server";
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

const schema = z.object({
  token: z.string().min(10),
  // Même règle qu'à l'inscription : 12+ car., minuscule + majuscule + chiffre.
  password: z
    .string()
    .min(12)
    .max(128)
    .regex(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
});

export const POST = withErrors(async (req: Request) => {
  const rl = await rateLimit(
    `reset:${clientIp(req)}`,
    LIMITS.passwordReset.limit,
    LIMITS.passwordReset.windowMs,
  );
  if (!rl.allowed) return jsonError(429, "RATE_LIMITED");

  const body = schema.parse(await readJsonLimited(req));
  const user = await prisma.user.findUnique({
    where: { passwordResetToken: body.token },
  });
  // Jeton inconnu ou expiré -> message générique (anti-énumération + sécurité).
  if (
    !user ||
    !user.passwordResetExpires ||
    user.passwordResetExpires.getTime() < Date.now()
  ) {
    return jsonError(400, "INVALID_TOKEN");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(body.password),
      passwordResetToken: null,
      passwordResetExpires: null,
      // Reset via token = compte potentiellement compromis : on tue TOUTE session
      // résiduelle (jeton volé). L'utilisateur n'est pas connecté ici -> rien à
      // re-signer, il se reconnectera avec son nouveau mot de passe.
      sessionVersion: { increment: 1 },
    },
  });
  return NextResponse.json({ ok: true });
});
