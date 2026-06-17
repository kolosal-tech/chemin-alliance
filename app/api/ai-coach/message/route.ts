import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { clientIp, jsonError, withErrors } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";
import { rateLimit, LIMITS } from "@/lib/security/rate-limit";
import { askCoach, DAILY_FREE_LIMIT } from "@/lib/ai-coach";
import { encryptField } from "@/lib/security/crypto";
import { tierForSubscription } from "@/lib/llm/matrix";
import type { Locale } from "@/lib/core-engine";

const schema = z.object({
  question: z.string().min(1).max(2000),
  matchId: z.string().optional(),
  mode: z.enum(["individual", "couple"]).default("individual"),
});

export const POST = withErrors(async (req: Request) => {
  const user = await requireUser();
  const rl = await rateLimit(
    `ai:${user.id}:${clientIp(req)}`,
    LIMITS.aiCoach.limit,
    LIMITS.aiCoach.windowMs,
  );
  if (!rl.allowed) return jsonError(429, "RATE_LIMITED");

  const body = schema.parse(await req.json());

  // Quota gratuit quotidien (compteur en DB)
  const day = new Date();
  day.setUTCHours(0, 0, 0, 0);
  const usage = await prisma.aiCoachUsage.upsert({
    where: { userId_day: { userId: user.id, day } },
    create: { userId: user.id, day, count: 1 },
    update: { count: { increment: 1 } },
  });
  if (usage.count > DAILY_FREE_LIMIT) {
    return NextResponse.json(
      { quotaExceeded: true, limit: DAILY_FREE_LIMIT },
      { status: 429 },
    );
  }

  let stage = null;
  if (body.matchId) {
    const match = await prisma.match.findUnique({
      where: { id: body.matchId },
    });
    if (match && (match.userAId === user.id || match.userBId === user.id)) {
      stage = match.stage;
    }
  }

  const reply = await askCoach(body.question, {
    stage,
    locale: (user.locale ?? "fr") as Locale,
    rulesetId: user.rulesetId,
    country: user.country ?? undefined,
    // Palier LLM : premium (opus-4.8) pour un abonnement actif, sinon standard.
    tier: tierForSubscription(user.subscriptionStatus),
  });
  // Persistance chiffrée : la question + la réponse, pour qu'elles survivent
  // au rechargement de la page (le coach était jusque-là sans mémoire).
  await prisma.coachMessage.createMany({
    data: [
      {
        userId: user.id,
        mode: body.mode,
        role: "user",
        contentEncrypted: encryptField(body.question),
      },
      {
        userId: user.id,
        mode: body.mode,
        role: "coach",
        contentEncrypted: encryptField(reply.text ?? ""),
        guardrail: Boolean(reply.guardrail),
      },
    ],
  });

  return NextResponse.json({
    ...reply,
    remaining: Math.max(0, DAILY_FREE_LIMIT - usage.count),
  });
});
