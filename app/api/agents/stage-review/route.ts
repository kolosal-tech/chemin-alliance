import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, withErrors } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";
import { requireMatchMember } from "@/lib/alliance";
import { rateLimit } from "@/lib/security/rate-limit";
import { buildReviewData, narrateReview } from "@/lib/agents/stage-review";
import { loadRuleset, type Locale } from "@/lib/core-engine";

const schema = z.object({ matchId: z.string().min(1) });

export const POST = withErrors(async (req: Request) => {
  const user = await requireUser();
  const rl = await rateLimit(`review:${user.id}`, 6, 60 * 60_000);
  if (!rl.allowed) return jsonError(429, "RATE_LIMITED");
  const { matchId } = schema.parse(await req.json());
  const match = await requireMatchMember(matchId, user.id);

  const answers = await prisma.allianceAnswer.findMany({
    where: { matchId: match.id },
  });
  const mine = answers.filter((a) => a.userId === user.id);
  const otherIds = answers
    .filter((a) => a.userId !== user.id)
    .map((a) => a.questionId);

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
      dataJson: review,
      visibility: "PRIVATE",
    },
  });
  return NextResponse.json(review);
});
