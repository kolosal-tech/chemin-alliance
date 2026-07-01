import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, withErrors } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";
import { requireMatchMember } from "@/lib/alliance";
import { questionText, uncoveredThemes } from "@/lib/agents/facilitator";
import { rateLimit } from "@/lib/security/rate-limit";
import type { Locale } from "@/lib/core-engine";

export const GET = withErrors(async (req: Request) => {
  const user = await requireUser();
  const rl = await rateLimit(`facilitator:${user.id}`, 6, 60 * 60_000);
  if (!rl.allowed) return jsonError(429, "RATE_LIMITED");
  const matchId = new URL(req.url).searchParams.get("matchId");
  if (!matchId) return jsonError(400, "MATCH_ID_REQUIRED");
  const match = await requireMatchMember(matchId, user.id);
  const answers = await prisma.allianceAnswer.findMany({
    where: { matchId: match.id },
    select: { questionId: true },
  });
  const locale = (user.locale ?? "fr") as Locale;
  const { themes, suggestions } = uncoveredThemes(
    user.rulesetId,
    match.stage,
    answers.map((a) => a.questionId),
  );
  return NextResponse.json({
    themes,
    suggestions: suggestions.map((q) => ({
      id: q.id,
      theme: q.theme,
      text: questionText(q, locale),
    })),
  });
});
