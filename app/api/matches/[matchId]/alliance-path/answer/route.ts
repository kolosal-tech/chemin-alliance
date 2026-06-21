import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, readJsonLimited, withErrors } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";
import { requireMatchMember } from "@/lib/alliance";
import { getStageQuestions } from "@/lib/core-engine";

const schema = z.object({
  questionId: z.string().min(1),
  answer: z.string().min(1).max(4000),
});

export const POST = withErrors(
  async (req: Request, { params }: { params: { matchId: string } }) => {
    const user = await requireUser();
    const match = await requireMatchMember(params.matchId, user.id);
    if (match.stage === "CLOSED") return jsonError(409, "MATCH_CLOSED");
    const body = schema.parse(await readJsonLimited(req));

    const questions = getStageQuestions(user.rulesetId, match.stage);
    if (!questions.some((q) => q.id === body.questionId)) {
      return jsonError(400, "UNKNOWN_QUESTION");
    }

    await prisma.allianceAnswer.upsert({
      where: {
        matchId_userId_questionId: {
          matchId: match.id,
          userId: user.id,
          questionId: body.questionId,
        },
      },
      create: {
        matchId: match.id,
        userId: user.id,
        stage: match.stage,
        questionId: body.questionId,
        answer: body.answer,
      },
      update: { answer: body.answer },
    });
    return NextResponse.json({ ok: true });
  },
);
