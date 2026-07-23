import { NextResponse } from "next/server";
import { z } from "zod";
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
import { activeMatchMemberWhere } from "@/lib/alliance";
import { prisma } from "@/lib/db";
import {
  AiCoachConsentRequiredError,
  AiCoachQuotaExceededError,
  getActiveAiCoachConsent,
  withAdmittedAiCoachTransfer,
} from "@/lib/ai-coach/consent";
import {
  assertLlmDeadlineActive,
  LlmDeadlineExceededError,
  withLlmDeadline,
} from "@/lib/llm/deadline";

const schema = z.object({
  question: z.string().min(1).max(2000),
  matchId: z.string().optional(),
  mode: z.enum(["individual", "couple"]).default("individual"),
});

const LOCKED_OPERATION_DEADLINE_MS = 15_000;

export const POST = withErrors(async (req: Request) => {
  const user = await requireUser();
  // Email non verifie : l'IA payante (cout fournisseur) reste fermee, comme le
  // matching. La lecture du contenu de l'app reste libre (cf. audit ticket 1).
  if (!user.isVerified) return jsonError(403, "EMAIL_NOT_VERIFIED");

  // Autorité exclusivement serveur : avant quota, historique, persistance et
  // surtout avant askCoach/callLLM, exiger le type + la version + la finalité +
  // le destinataire exacts. Une ligne historique, révoquée ou incomplète
  // échoue fermée et ne peut déclencher aucun POST fournisseur.
  const consent = await getActiveAiCoachConsent(user.id);
  if (!consent) return jsonError(403, "AI_COACH_CONSENT_REQUIRED");

  const body = schema.parse(await readJsonLimited(req));

  const ip = clientIp(req);
  const [userRateLimit, ipRateLimit] = await Promise.all([
    rateLimit(
      `ai:user:${user.id}`,
      LIMITS.aiCoach.limit,
      LIMITS.aiCoach.windowMs,
    ),
    rateLimit(`ai:ip:${ip}`, LIMITS.aiCoachIp.limit, LIMITS.aiCoachIp.windowMs),
  ]);
  if (!userRateLimit.allowed || !ipRateLimit.allowed) {
    return jsonError(429, "RATE_LIMITED");
  }

  try {
    // L'échéance démarre AVANT l'admission. Une attente de verrou consomme donc
    // le même budget de 15 s et ne peut jamais repousser le départ réseau.
    return await withLlmDeadline(LOCKED_OPERATION_DEADLINE_MS, () =>
      withAdmittedAiCoachTransfer(
        user.id,
        user.subscriptionStatus === "active",
        async ({ remaining }) => {
          // Consentement et quota sont maintenant committés dans une courte
          // transaction. Le bail reste visible pendant tout le callback, mais
          // aucune connexion PostgreSQL n'est gardée pendant le réseau.
          const [match, priorRows] = await Promise.all([
            body.matchId
              ? prisma.match.findFirst({
                  where: activeMatchMemberWhere(body.matchId, user.id),
                  select: { stage: true },
                })
              : Promise.resolve(null),
            prisma.coachMessage.findMany({
              where: { userId: user.id, mode: body.mode, guardrail: false },
              orderBy: { createdAt: "desc" },
              take: 10,
            }),
          ]);

          const stage = match?.stage ?? null;
          const history = priorRows
            .reverse()
            .map((row) => ({
              role:
                row.role === "coach"
                  ? ("assistant" as const)
                  : ("user" as const),
              content: decryptOptional(row.contentEncrypted) ?? "",
            }))
            .filter((turn) => turn.content.length > 0);

          // L'échéance globale, démarrée à l'acquisition du verrou, est propagée
          // jusqu'à fetch. Le callback ne se termine qu'une fois le transfert
          // arrêté, avant libération du verrou.
          const reply = await askCoach(body.question, {
            stage,
            locale: (user.locale ?? "fr") as Locale,
            rulesetId: user.rulesetId,
            country: user.country ?? undefined,
            tier: tierForSubscription(user.subscriptionStatus),
            history,
          });
          assertLlmDeadlineActive();

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

          return NextResponse.json({ ...reply, remaining });
        },
      ),
    );
  } catch (error) {
    if (error instanceof AiCoachConsentRequiredError) {
      return jsonError(403, "AI_COACH_CONSENT_REQUIRED");
    }
    if (error instanceof LlmDeadlineExceededError) {
      return jsonError(504, "AI_COACH_PROVIDER_TIMEOUT");
    }
    if (error instanceof AiCoachQuotaExceededError) {
      return NextResponse.json(
        { quotaExceeded: true, limit: DAILY_FREE_LIMIT },
        { status: 429 },
      );
    }
    throw error;
  }
});
