import { Prisma, type AllianceStage, type Match } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getStageQuestions, type ActionContext } from "@/lib/core-engine";
import { unblockedMatchWhere } from "@/lib/blocks";
import { activeSensitiveDataConsentPairWhere } from "@/lib/sensitive-data-consent";

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

  const [qualifiedReports, dialogueAnswers, stageAnswers] = await Promise.all([
    prisma.report.count({
      where: {
        // OPEN = déclaration non qualifiée. Seule une revue humaine explicite
        // peut déclencher le veto de sûreté sur la progression.
        status: "REVIEWING",
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
    hasActiveReport: qualifiedReports > 0,
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

function matchAccessWhere(
  matchId: string,
  userId: string,
  status: "ACTIVE" | "PENDING" | { in: Array<"ACTIVE" | "PENDING"> },
): Prisma.MatchWhereInput {
  return {
    AND: [
      { id: matchId, status },
      activeSensitiveDataConsentPairWhere,
      unblockedMatchWhere(userId),
    ],
  };
}

export function activeMatchMemberWhere(
  matchId: string,
  userId: string,
): Prisma.MatchWhereInput {
  return matchAccessWhere(matchId, userId, "ACTIVE");
}

export function pendingMatchDecisionWhere(
  matchId: string,
  userId: string,
): Prisma.MatchWhereInput {
  return matchAccessWhere(matchId, userId, "PENDING");
}

export function pendingMatchDecisionsWhere(
  userId: string,
): Prisma.MatchWhereInput {
  return {
    AND: [
      { status: "PENDING" },
      activeSensitiveDataConsentPairWhere,
      unblockedMatchWhere(userId),
    ],
  };
}

function matchNotAccessible(): never {
  // 404 plutôt que 403 : ne révèle ni l'existence du match, ni son état, ni
  // l'identité de la personne ayant éventuellement bloqué l'appelant.
  throw Object.assign(new Error("NOT_FOUND"), { status: 404 });
}

/** Frontière par défaut de toute lecture ou interaction sensible. */
export async function requireActiveMatchMember(
  matchId: string,
  userId: string,
) {
  const match = await prisma.match.findFirst({
    where: activeMatchMemberWhere(matchId, userId),
  });
  return match ?? matchNotAccessible();
}

/** Lecture minimale réservée aux routes d'acceptation/refus d'une demande. */
export async function requirePendingMatchDecisionMember(
  matchId: string,
  userId: string,
) {
  const match = await prisma.match.findFirst({
    where: pendingMatchDecisionWhere(matchId, userId),
    select: {
      id: true,
      status: true,
      requestedById: true,
    },
  });
  return match ?? matchNotAccessible();
}

/** Seule exception mixte : clôturer une relation ACTIVE ou refuser PENDING. */
export async function requireClosableMatchMember(
  matchId: string,
  userId: string,
) {
  const match = await prisma.match.findFirst({
    where: matchAccessWhere(matchId, userId, {
      in: ["ACTIVE", "PENDING"],
    }),
    select: {
      id: true,
      status: true,
      requestedById: true,
    },
  });
  return match ?? matchNotAccessible();
}
