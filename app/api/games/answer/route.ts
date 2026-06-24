import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import type { Locale } from "@/lib/core-engine";
import { requireUser } from "@/lib/security/session";
import { jsonError, readJsonLimited, withErrors } from "@/lib/api-helpers";
import { getPersonaReply } from "@/lib/services/alliance-game-service";

export const runtime = "nodejs";

const schema = z.object({
  sessionId: z.string().min(1),
  questionKey: z.string().min(1).max(64),
  questionPrompt: z.string().min(1).max(1000),
  userAnswer: z.string().min(1).max(2000),
  questionOrder: z.number().int().min(0).max(50),
});

/** Enregistre la reponse de l'utilisateur, fait repondre la persona, persiste les deux. */
export const POST = withErrors(async (req: Request) => {
  const user = await requireUser();
  const body = schema.parse(await readJsonLimited(req));

  const session = await prisma.gameSession.findFirst({
    where: { id: body.sessionId, userId: user.id, status: "IN_PROGRESS" },
    include: {
      persona: { select: { systemPrompt: true, displayName: true } },
    },
  });
  if (!session) return jsonError(404, "SESSION_NOT_FOUND");

  // Reponse de la persona (Echo IA) via la passerelle LLM (best-effort).
  const personaAnswer = await getPersonaReply({
    persona: session.persona,
    gameType: session.gameType,
    questionPrompt: body.questionPrompt,
    userAnswer: body.userAnswer,
    locale: (session.locale ?? "fr") as Locale,
  });

  await prisma.gameAnswer.create({
    data: {
      sessionId: session.id,
      questionKey: body.questionKey,
      questionOrder: body.questionOrder,
      userAnswer: body.userAnswer,
      personaAnswer,
    },
  });

  return NextResponse.json({ personaAnswer });
});
