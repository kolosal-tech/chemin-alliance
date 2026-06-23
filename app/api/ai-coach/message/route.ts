import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  clientIp,
  jsonError,
  readJsonLimited,
  withErrors,
} from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";
import { rateLimit, LIMITS } from "@/lib/security/rate-limit";
import { askCoach, DAILY_FREE_LIMIT } from "@/lib/ai-coach";
import { encryptField, decryptOptional } from "@/lib/security/crypto";
import { tierForSubscription } from "@/lib/llm/matrix";
import type { Locale } from "@/lib/core-engine";

const schema = z.object({
  question: z.string().min(1).max(2000),
  matchId: z.string().optional(),
  mode: z.enum(["individual", "couple"]).default("individual"),
});

export const POST = withErrors(async (req: Request) => {
  const user = await requireUser();
  // Email non verifie : l'IA payante (cout fournisseur) reste fermee, comme le
  // matching. La lecture du contenu de l'app reste libre (cf. audit ticket 1).
  if (!user.isVerified) return jsonError(403, "EMAIL_NOT_VERIFIED");
  const rl = await rateLimit(
    `ai:${user.id}:${clientIp(req)}`,
    LIMITS.aiCoach.limit,
    LIMITS.aiCoach.windowMs,
  );
  if (!rl.allowed) return jsonError(429, "RATE_LIMITED");

  const body = schema.parse(await readJsonLimited(req));

  // Quota quotidien : l'entitlement premium "unlimited_discovery" lève le
  // plafond pour un abonné actif (un payant ne doit pas être bridé comme un
  // gratuit). Sinon, compteur atomique en DB.
  const isPremium = user.subscriptionStatus === "active";
  let remaining: number | null = null;
  if (!isPremium) {
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
    remaining = Math.max(0, DAILY_FREE_LIMIT - usage.count);
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

  // Memoire de conversation : on renvoie les derniers tours au modele pour une
  // continuite naturelle (le coach ne "redemarre" plus a chaque message). On
  // exclut les tours garde-fous (redirection coach humain) du contexte renvoye.
  const priorRows = await prisma.coachMessage.findMany({
    where: { userId: user.id, mode: body.mode, guardrail: false },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  const history = priorRows
    .reverse()
    .map((r) => ({
      role: r.role === "coach" ? ("assistant" as const) : ("user" as const),
      content: decryptOptional(r.contentEncrypted) ?? "",
    }))
    .filter((h) => h.content.length > 0);

  const reply = await askCoach(body.question, {
    stage,
    locale: (user.locale ?? "fr") as Locale,
    rulesetId: user.rulesetId,
    country: user.country ?? undefined,
    // Palier LLM : premium (opus-4.8) pour un abonnement actif, sinon standard.
    tier: tierForSubscription(user.subscriptionStatus),
    history,
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

  // remaining = null pour un abonné premium (illimité) ; sinon jetons restants.
  return NextResponse.json({ ...reply, remaining });
});
