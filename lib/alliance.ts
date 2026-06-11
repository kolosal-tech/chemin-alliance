import type { AllianceStage, Match } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getStageQuestions, type ActionContext } from "@/lib/core-engine";

/**
 * Construit le contexte factuel pour validateAction à partir de la DB.
 * Le moteur ne lit jamais la DB lui-même.
 */
export async function buildActionContext(
  match: Match,
  userId: string,
  rulesetId: string,
  locale?: "fr" | "en" | "es" | "pt",
): Promise<ActionContext> {
  const otherId = match.userAId === userId ? match.userBId : match.userAId;

  const [activeReports, dialogueAnswers, stageAnswers] = await Promise.all([
    prisma.report.count({
      where: {
        status: { in: ["OPEN", "REVIEWING"] },
        targetUserId: { in: [userId, otherId] },
      },
    }),
    prisma.allianceAnswer.count({
      where: { matchId: match.id, stage: "DIALOGUE" },
    }),
    prisma.allianceAnswer.count({
      where: { matchId: match.id, stage: match.stage },
    }),
  ]);

  const stageQuestions = getStageQuestions(rulesetId, match.stage);

  // Consentement mutuel d'avancement : l'autre a déjà demandé l'avancement.
  const mutualConsent =
    match.advanceRequestedBy != null && match.advanceRequestedBy !== userId;

  return {
    locale,
    hasActiveReport: activeReports > 0,
    mutualConsent,
    dialogueAnswersCount: dialogueAnswers,
    stageAnswersCount: stageAnswers,
    stageQuestionsTotal: stageQuestions.length * 2, // les deux membres répondent
    contactExchangeStatus: match.contactExchange,
  };
}

export const STAGE_SEQUENCE: AllianceStage[] = [
  "DISCOVERY",
  "DIALOGUE",
  "DISCERNMENT",
  "ACCOMPANIMENT",
  "COMMITMENT",
  "MARRIAGE_PREPARATION",
];

export function nextStage(stage: AllianceStage): AllianceStage | null {
  const i = STAGE_SEQUENCE.indexOf(stage);
  if (i < 0 || i === STAGE_SEQUENCE.length - 1) return null;
  return STAGE_SEQUENCE[i + 1];
}

export async function requireMatchMember(matchId: string, userId: string) {
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) throw Object.assign(new Error("NOT_FOUND"), { status: 404 });
  if (match.userAId !== userId && match.userBId !== userId) {
    throw Object.assign(new Error("FORBIDDEN"), { status: 403 });
  }
  return match;
}
