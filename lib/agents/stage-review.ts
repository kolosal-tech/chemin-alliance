import type { AllianceStage } from "@prisma/client";
import type { Locale } from "@/lib/core-engine";
import type { ReadableAllianceAnswer } from "@/lib/alliance-answer";

/**
 * Agent 4 - Bilan d'Étape. Relecture PRIVÉE pour un seul membre :
 * construit uniquement à partir de SES réponses et de la couverture des
 * thèmes (jamais le contenu des réponses de l'autre).
 */
type StageReview = {
  alignedThemes: string[]; // thèmes où les deux ont répondu
  openThemes: string[]; // thèmes où un seul a répondu
  myHighlights: Array<{ questionId: string; excerpt: string }>;
  narrative: string | null; // mot personnalisé (LLM) ou null
};

export function buildReviewData(
  myAnswers: ReadableAllianceAnswer[],
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

const REVIEW_COPY: Record<
  Locale,
  {
    intro: string;
    aligned: string;
    open: string;
    none: string;
    question: string;
  }
> = {
  fr: {
    intro: "Ce bilan local résume simplement l’avancement de cette étape.",
    aligned: "Les thèmes abordés par chacun sont",
    open: "Les thèmes qui restent ouverts sont",
    none: "aucun pour le moment",
    question: "Quel thème souhaites-tu approfondir avec calme maintenant ?",
  },
  en: {
    intro: "This local review simply summarizes progress at this stage.",
    aligned: "Themes addressed by both people are",
    open: "Themes that remain open are",
    none: "none for now",
    question: "Which theme would you like to explore calmly now?",
  },
  es: {
    intro: "Este balance local resume sencillamente el avance de esta etapa.",
    aligned: "Los temas abordados por ambas personas son",
    open: "Los temas que siguen abiertos son",
    none: "ninguno por ahora",
    question: "¿Qué tema te gustaría profundizar con calma ahora?",
  },
  pt: {
    intro:
      "Este balanço local resume de forma simples o progresso desta etapa.",
    aligned: "Os temas abordados por ambos são",
    open: "Os temas que continuam em aberto são",
    none: "nenhum por enquanto",
    question: "Que tema gostarias de aprofundar com calma agora?",
  },
};

export async function narrateReview(
  data: Omit<StageReview, "narrative">,
  stage: AllianceStage,
  locale: Locale,
): Promise<string | null> {
  void stage;
  if (data.myHighlights.length === 0) return null;
  const copy = REVIEW_COPY[locale] ?? REVIEW_COPY.fr;
  return [
    copy.intro,
    `${copy.aligned}: ${data.alignedThemes.join(", ") || copy.none}.`,
    `${copy.open}: ${data.openThemes.join(", ") || copy.none}.`,
    copy.question,
  ].join(" ");
}
