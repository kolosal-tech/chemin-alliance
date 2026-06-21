import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sealInsight } from "@/lib/agent-insight";
import { jsonError, readJsonLimited, withErrors } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";
import { rateLimit } from "@/lib/security/rate-limit";
import {
  checkinSchema,
  evaluateCheckin,
  guardianWord,
  DANGER_RESPONSE,
} from "@/lib/agents/guardian";
import { emergencyLine } from "@/lib/emergency";
import type { Locale } from "@/lib/core-engine";

/**
 * Check-in du Gardien - INDIVIDUEL et PRIVÉ : le conjoint ne voit jamais
 * les réponses de l'autre. Danger détecté -> orientation pro immédiate,
 * AVANT tout appel LLM.
 */
export const POST = withErrors(async (req: Request) => {
  const user = await requireUser();
  const rl = await rateLimit(`guardian:${user.id}`, 6, 60 * 60_000);
  if (!rl.allowed) return jsonError(429, "RATE_LIMITED");
  const body = checkinSchema.parse(await readJsonLimited(req));

  const space = await prisma.coupleSpace.findFirst({
    where: {
      OR: [{ userAId: user.id }, { userBId: user.id }],
      status: "ACTIVE",
    },
  });
  if (!space) return jsonError(404, "NO_SPACE");

  const locale = (user.locale ?? "fr") as Locale;
  const season =
    space.season === "PARENTS"
      ? "PARENTS"
      : space.season === "ENGAGED"
        ? "ENGAGED"
        : "MARRIED";
  const evaluated = evaluateCheckin(season, body.answers, locale);

  if (evaluated.danger) {
    await prisma.agentInsight.create({
      data: {
        userId: user.id,
        coupleSpaceId: space.id,
        agentId: "guardian",
        kind: "DANGER_ESCALATION",
        dataJson: sealInsight({ escalated: true }),
        visibility: "COACH_ONLY",
      },
    });
    return NextResponse.json({
      danger: true,
      rituals: [],
      word: `${DANGER_RESPONSE[locale]} ${emergencyLine(user.country, locale)}`,
    });
  }

  const word = await guardianWord(season, body.answers, locale);
  await prisma.agentInsight.create({
    data: {
      userId: user.id,
      coupleSpaceId: space.id,
      agentId: "guardian",
      kind: "CHECKIN",
      dataJson: sealInsight({
        answers: body.answers,
        rituals: evaluated.rituals,
      }),
      visibility: "PRIVATE",
    },
  });
  return NextResponse.json({ danger: false, rituals: evaluated.rituals, word });
});
