import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, withErrors } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";
import { rateLimit, LIMITS } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

// Aucun champ attendu : on valide/strip défensivement tout corps reçu.
const schema = z.object({}).strip();

/**
 * Marque l'onboarding comme fait (flag persistant `User.onboardingDoneAt`).
 * Authentifié, rate-limité, idempotent (ne réécrit pas la date si déjà posée).
 * Ne touche ni au chiffrement ni à l'auth — simple horodatage.
 */
export const POST = withErrors(async (req: Request) => {
  const user = await requireUser();
  const rl = await rateLimit(
    `onboarding-done:${user.id}`,
    LIMITS.onboarding.limit,
    LIMITS.onboarding.windowMs,
  );
  if (!rl.allowed) return jsonError(429, "RATE_LIMITED");

  schema.parse(await req.json().catch(() => ({})));

  if (!user.onboardingDoneAt) {
    await prisma.user.update({
      where: { id: user.id },
      data: { onboardingDoneAt: new Date() },
    });
  }
  return NextResponse.json({ ok: true });
});
