import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { sealInsight } from "@/lib/agent-insight";
import { jsonError, readJsonLimited, withErrors } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";
import { requireActiveMatchMember } from "@/lib/alliance";
import { rateLimit } from "@/lib/security/rate-limit";
import { buildReviewData, narrateReview } from "@/lib/agents/stage-review";
import { toReadableAllianceAnswer } from "@/lib/alliance-answer";
import { loadRuleset, type Locale } from "@/lib/core-engine";

const schema = z.object({ matchId: z.string().min(1) });

export const POST = withErrors(async (req: Request) => {
  const user = await requireUser();
  const rl = await rateLimit(`review:${user.id}`, 6, 60 * 60_000);
  if (!rl.allowed) return jsonError(429, "RATE_LIMITED");
  const { matchId } = schema.parse(await readJsonLimited(req));
  const match = await requireActiveMatchMember(matchId, user.id);

  const [myStoredAnswers, otherAnswers] = await Promise.all([
    prisma.allianceAnswer.findMany({
      where: { matchId: match.id, userId: user.id },
      select: {
        questionId: true,
        userId: true,
        answerEncrypted: true,
        answerLegacy: true,
      },
    }),
    prisma.allianceAnswer.findMany({
      where: { matchId: match.id, userId: { not: user.id } },
      select: { questionId: true },
    }),
  ]);
  const mine = myStoredAnswers.map(toReadableAllianceAnswer);
  const otherIds = otherAnswers.map((a) => a.questionId);

  const ruleset = loadRuleset(user.rulesetId);
  const questionThemes: Record<string, string> = {};
  for (const st of Object.values(ruleset.stages)) {
    for (const q of st.questions) questionThemes[q.id] = q.theme;
  }

  const data = buildReviewData(mine, otherIds, questionThemes);
  const narrative = await narrateReview(
    data,
    match.stage,
    (user.locale ?? "fr") as Locale,
  );
  const review = { ...data, narrative };

  await prisma.agentInsight.create({
    data: {
      userId: user.id,
      matchId: match.id,
      agentId: "stage-review",
      kind: "STAGE_REVIEW",
      dataJson: sealInsight(review),
      visibility: "PRIVATE",
    },
  });
  return NextResponse.json(review);
});
