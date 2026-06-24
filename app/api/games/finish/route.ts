import { NextResponse } from "next/server";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import type { Locale } from "@/lib/core-engine";
import { requireUser } from "@/lib/security/session";
import { jsonError, readJsonLimited, withErrors } from "@/lib/api-helpers";
import {
  generatePastoralSynthesis,
  type AnswerPair,
} from "@/lib/services/alliance-game-service";

export const runtime = "nodejs";

const schema = z.object({ sessionId: z.string().min(1) });

/** Cloture la partie : synthese pastorale geo-consciente, puis scelle la session. */
export const POST = withErrors(async (req: Request) => {
  const user = await requireUser();
  const { sessionId } = schema.parse(await readJsonLimited(req));

  const session = await prisma.gameSession.findFirst({
    where: { id: sessionId, userId: user.id },
    include: {
      persona: { select: { displayName: true } },
      answers: { orderBy: { questionOrder: "asc" } },
    },
  });
  if (!session) return jsonError(404, "SESSION_NOT_FOUND");

  const locale = (session.locale ?? "fr") as Locale;
  // On reconstruit le texte des prompts depuis les cles i18n, dans la locale
  // de l'utilisateur (les reponses ne stockent que la cle, pas le texte).
  const t = await getTranslations({ locale, namespace: "alliance_lab" });
  const answers: AnswerPair[] = session.answers.map((a) => ({
    questionKey: a.questionKey,
    questionPrompt: t(`${a.questionKey}.prompt`),
    userAnswer: a.userAnswer,
    personaAnswer: a.personaAnswer,
  }));

  const synthesis = await generatePastoralSynthesis({
    gameType: session.gameType,
    answers,
    personaName: session.persona.displayName,
    locale,
    region: session.region,
    premium: user.subscriptionStatus === "active",
  });

  await prisma.gameSession.update({
    where: { id: session.id },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      synthesis: synthesis ? { text: synthesis } : undefined,
    },
  });

  return NextResponse.json({ synthesis });
});
