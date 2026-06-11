import type { AllianceAnswer, AllianceStage } from "@prisma/client";
import type { Locale } from "@/lib/core-engine";
import { completeText } from "./llm";

/**
 * Agent 4 — Bilan d'Étape. Relecture PRIVÉE pour un seul membre :
 * construit uniquement à partir de SES réponses et de la couverture des
 * thèmes (jamais le contenu des réponses de l'autre).
 */
export type StageReview = {
  alignedThemes: string[]; // thèmes où les deux ont répondu
  openThemes: string[]; // thèmes où un seul a répondu
  myHighlights: Array<{ questionId: string; excerpt: string }>;
  narrative: string | null; // mot personnalisé (LLM) ou null
};

export function buildReviewData(
  myAnswers: AllianceAnswer[],
  otherAnsweredQuestionIds: string[],
  questionThemes: Record<string, string>,
): Omit<StageReview, "narrative"> {
  const otherSet = new Set(otherAnsweredQuestionIds);
  const aligned = new Set<string>();
  const open = new Set<string>();
  for (const a of myAnswers) {
    const theme = questionThemes[a.questionId] ?? "autre";
    if (otherSet.has(a.questionId)) aligned.add(theme);
    else open.add(theme);
  }
  for (const qid of otherAnsweredQuestionIds) {
    if (!myAnswers.some((a) => a.questionId === qid)) {
      open.add(questionThemes[qid] ?? "autre");
    }
  }
  for (const t of aligned) open.delete(t);
  return {
    alignedThemes: [...aligned],
    openThemes: [...open],
    myHighlights: myAnswers.slice(0, 4).map((a) => ({
      questionId: a.questionId,
      excerpt: a.answer.slice(0, 140),
    })),
  };
}

const SYSTEM = `Tu rédiges un court bilan d'étape personnel pour une personne en parcours de discernement chrétien vers le mariage.
Règles : tu t'adresses à ELLE seule, à partir de SES réponses ; ton chaleureux et sobre ;
tu ne juges pas l'autre personne ; tu ne dis jamais "vous devez vous marier" ni l'inverse ;
tu n'affirmes jamais une volonté divine ; 4-6 phrases maximum ; termine par UNE question ouverte.`;

export async function narrateReview(
  data: Omit<StageReview, "narrative">,
  stage: AllianceStage,
  locale: Locale,
): Promise<string | null> {
  if (data.myHighlights.length === 0) return null;
  return completeText(
    `${SYSTEM}\nLangue: ${locale}. Étape: ${stage}.`,
    `Thèmes partagés à deux: ${data.alignedThemes.join(", ") || "aucun"}.
Thèmes encore ouverts: ${data.openThemes.join(", ") || "aucun"}.
Mes réponses (extraits): ${data.myHighlights.map((h) => h.excerpt).join(" | ")}`,
    400,
  );
}
