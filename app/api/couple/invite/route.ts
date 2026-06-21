import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, readJsonLimited, withErrors } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";
import { rateLimit, LIMITS } from "@/lib/security/rate-limit";
import { sendCoupleInviteEmail } from "@/lib/email";
import type { Locale } from "@/lib/core-engine";

const schema = z.object({ email: z.string().email().toLowerCase() });

/** Envoie le code d'invitation de l'espace couple à l'email du conjoint/fiancé·e. */
export const POST = withErrors(async (req: Request) => {
  const user = await requireUser();
  const rl = await rateLimit(
    `couple-invite:${user.id}`,
    LIMITS.invite.limit,
    LIMITS.invite.windowMs,
  );
  if (!rl.allowed) return jsonError(429, "RATE_LIMITED");

  const { email } = schema.parse(await readJsonLimited(req));
  if (email === user.email.toLowerCase()) {
    return jsonError(400, "INVALID_TARGET");
  }

  // Espace de l'utilisateur en attente d'un conjoint : seul le créateur, avec
  // un code encore actif (userBId null), peut envoyer une invitation.
  const space = await prisma.coupleSpace.findFirst({
    where: { userAId: user.id, userBId: null },
  });
  if (!space) return jsonError(409, "NO_PENDING_INVITE");

  const ok = await sendCoupleInviteEmail(
    email,
    user.displayName,
    space.inviteCode,
    (user.locale ?? "fr") as Locale,
  );
  if (!ok) return jsonError(502, "EMAIL_FAILED");
  return NextResponse.json({ ok: true });
});
