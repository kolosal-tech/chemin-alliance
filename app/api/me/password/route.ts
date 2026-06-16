import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, withErrors } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";
import { hashPassword, verifyPassword } from "@/lib/security/password";
import { passwordField } from "@/lib/security/password-validation";
import { rateLimit, LIMITS } from "@/lib/security/rate-limit";

const schema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: passwordField,
});

// Changer son mot de passe (authentifié). La session reste valide : le nouveau
// MDP ne sera requis qu'à la prochaine connexion.
export const POST = withErrors(async (req: Request) => {
  const user = await requireUser();
  const rl = await rateLimit(
    `password-change:${user.id}`,
    LIMITS.passwordChange.limit,
    LIMITS.passwordChange.windowMs,
  );
  if (!rl.allowed) return jsonError(429, "RATE_LIMITED");

  const { currentPassword, newPassword } = schema.parse(await req.json());
  if (!(await verifyPassword(user.passwordHash, currentPassword))) {
    return jsonError(400, "INVALID_CREDENTIALS");
  }
  if (await verifyPassword(user.passwordHash, newPassword)) {
    return jsonError(400, "SAME_PASSWORD");
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(newPassword) },
  });
  return NextResponse.json({ ok: true });
});
