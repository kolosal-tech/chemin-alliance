import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrors } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";
import { requireActiveMatchMember } from "@/lib/alliance";
import { compatibilityTopics } from "@/lib/matching";
import { getStageQuestions, type Locale } from "@/lib/core-engine";

export const GET = withErrors(
  async (
    _req: Request,
    { params }: { params: Promise<{ matchId: string }> },
  ) => {
    const user = await requireUser();
    const match = await requireActiveMatchMember(
      (await params).matchId,
      user.id,
    );
    const otherId = match.userAId === user.id ? match.userBId : match.userAId;
    const locale = (user.locale ?? "fr") as Locale;

    const [other, me, answers] = await Promise.all([
      prisma.user.findUniqueOrThrow({
        where: { id: otherId },
        include: { faithProfile: true, relationshipProfile: true },
      }),
      prisma.user.findUniqueOrThrow({
        where: { id: user.id },
        include: { faithProfile: true, relationshipProfile: true },
      }),
      prisma.allianceAnswer.findMany({
        where: { matchId: match.id, stage: match.stage },
        select: { questionId: true, userId: true },
      }),
    ]);

    const questions =
      match.stage === "CLOSED"
        ? []
        : getStageQuestions(user.rulesetId, match.stage).map((q) => ({
            id: q.id,
            theme: q.theme,
            text: q.text[locale] ?? q.text.fr,
            answeredByMe: answers.some(
              (a) => a.questionId === q.id && a.userId === user.id,
            ),
          }));

    return NextResponse.json({
      matchId: match.id,
      stage: match.stage,
      status: match.status,
      contactExchange: match.contactExchange,
      advanceRequestedByMe: match.advanceRequestedBy === user.id,
      advanceRequestedByOther:
        match.advanceRequestedBy != null &&
        match.advanceRequestedBy !== user.id,
      sinceDays: Math.max(
        0,
        Math.floor((Date.now() - match.updatedAt.getTime()) / 86_400_000),
      ),
      other: { id: other.id, displayName: other.displayName },
      questions,
      compatibility: compatibilityTopics(me, other),
    });
  },
);
