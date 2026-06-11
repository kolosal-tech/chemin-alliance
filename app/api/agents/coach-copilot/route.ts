import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, withErrors } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";
import { requireMatchMember } from "@/lib/alliance";
import { rateLimit } from "@/lib/security/rate-limit";
import {
  deterministicSummary,
  polishSummary,
} from "@/lib/agents/coach-copilot";
import { compatibilityTopics } from "@/lib/matching";
import { loadRuleset, type Locale } from "@/lib/core-engine";

const schema = z.object({
  matchId: z.string().min(1),
  consent: z.literal(true),
});

/**
 * Double consentement STRICT : le résumé n'existe que si les deux membres
 * du match ont un consentement COUPLE_COACH_SHARING actif.
 */
export const POST = withErrors(async (req: Request) => {
  const user = await requireUser();
  const rl = rateLimit(`copilot:${user.id}`, 6, 60 * 60_000);
  if (!rl.allowed) return jsonError(429, "RATE_LIMITED");
  const { matchId } = schema.parse(await req.json());
  const match = await requireMatchMember(matchId, user.id);
  const otherId = match.userAId === user.id ? match.userBId : match.userAId;

  const mine = await prisma.consent.findFirst({
    where: { userId: user.id, type: "COUPLE_COACH_SHARING", revokedAt: null },
  });
  if (!mine) {
    await prisma.consent.create({
      data: { userId: user.id, type: "COUPLE_COACH_SHARING" },
    });
  }
  const other = await prisma.consent.findFirst({
    where: { userId: otherId, type: "COUPLE_COACH_SHARING", revokedAt: null },
  });
  if (!other) {
    return NextResponse.json({ bothConsented: false, summary: null });
  }

  const answers = await prisma.allianceAnswer.findMany({
    where: { matchId: match.id },
  });
  const ruleset = loadRuleset(user.rulesetId);
  const themes: Record<string, string> = {};
  for (const st of Object.values(ruleset.stages)) {
    for (const q of st.questions) themes[q.id] = q.theme;
  }
  const byUser = (id: string) =>
    new Set(answers.filter((a) => a.userId === id).map((a) => themes[a.questionId]));
  const mineThemes = byUser(user.id);
  const otherThemes = byUser(otherId);
  const covered = [...mineThemes].filter((t) => otherThemes.has(t));
  const open = [
    ...new Set([...mineThemes, ...otherThemes]),
  ].filter((t) => !covered.includes(t));

  const [a, b] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      include: { faithProfile: true, relationshipProfile: true },
    }),
    prisma.user.findUniqueOrThrow({
      where: { id: otherId },
      include: { faithProfile: true, relationshipProfile: true },
    }),
  ]);
  const { topics } = compatibilityTopics(a, b);
  const locale = (user.locale ?? "fr") as Locale;
  const input = {
    stage: match.stage,
    sinceDays: Math.max(
      0,
      Math.floor((Date.now() - match.updatedAt.getTime()) / 86_400_000),
    ),
    coveredThemes: covered,
    openThemes: open,
    compatibility: topics,
  };
  const summary =
    (await polishSummary(input, locale)) ?? deterministicSummary(input, locale);

  await prisma.agentInsight.create({
    data: {
      userId: user.id,
      matchId: match.id,
      agentId: "coach-copilot",
      kind: "COACH_SUMMARY",
      dataJson: { summary },
      visibility: "COACH_ONLY",
    },
  });
  return NextResponse.json({ bothConsented: true, summary });
});
