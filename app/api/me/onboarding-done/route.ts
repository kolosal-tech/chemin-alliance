import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, readJsonLimited, withErrors } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";
import { rateLimit, LIMITS } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

// Résultat du bilan de maturité (lib/maturity scoreMaturity). Optionnel, validé
// défensivement : on le persiste pour que le moteur de matching l'exploite (P1),
// via AgentInsight (pas de migration de schéma).
const maturitySchema = z
  .object({
    perAxis: z.record(z.string(), z.number()).optional(),
    total: z.number().optional(),
    level: z.enum(["growing", "preparing", "ready"]).optional(),
    strengths: z.array(z.string()).max(6).optional(),
    growth: z.array(z.string()).max(6).optional(),
    suggestsPreparation: z.boolean().optional(),
  })
  .strip();
const schema = z.object({ maturity: maturitySchema.optional() }).strip();

/**
 * Marque l'onboarding comme fait (flag persistant `User.onboardingDoneAt`).
 * Authentifié, rate-limité, idempotent (ne réécrit pas la date si déjà posée).
 * Ne touche ni au chiffrement ni à l'auth - simple horodatage.
 */
export const POST = withErrors(async (req: Request) => {
  const user = await requireUser();
  const rl = await rateLimit(
    `onboarding-done:${user.id}`,
    LIMITS.onboarding.limit,
    LIMITS.onboarding.windowMs,
  );
  if (!rl.allowed) return jsonError(429, "RATE_LIMITED");

  const body = schema.parse(await readJsonLimited(req).catch(() => ({})));

  if (!user.onboardingDoneAt) {
    await prisma.user.update({
      where: { id: user.id },
      data: { onboardingDoneAt: new Date() },
    });
  }

  // P1 : persiste le bilan de maturité (exploitable par le matching). Stocké en
  // AgentInsight (dataJson) - zéro migration. On révoque l'ancien pour ne garder
  // que le plus récent (idempotent sur re-soumission).
  if (body.maturity && Object.keys(body.maturity).length > 0) {
    await prisma.agentInsight.updateMany({
      where: { userId: user.id, agentId: "maturity", revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await prisma.agentInsight.create({
      data: {
        userId: user.id,
        agentId: "maturity",
        kind: "BILAN",
        dataJson: body.maturity,
        visibility: "PRIVATE",
      },
    });
  }
  return NextResponse.json({ ok: true });
});
