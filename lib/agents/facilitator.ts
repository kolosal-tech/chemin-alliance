import type { AllianceStage } from "@prisma/client";
import { loadRuleset, type Locale, type Question } from "@/lib/core-engine";

/**
 * Agent 3 - Facilitateur de Dialogue. Repère les thèmes jamais abordés
 * par le couple et propose les questions du ruleset correspondantes.
 * Déterministe : la doctrine (thèmes/questions) vit dans les YAML.
 */
const STAGE_ORDER = [
  "discovery",
  "dialogue",
  "discernment",
  "accompaniment",
  "commitment",
  "marriage_preparation",
];

export function uncoveredThemes(
  rulesetId: string,
  stage: AllianceStage,
  answeredQuestionIds: string[],
): { themes: string[]; suggestions: Question[] } {
  if (stage === "CLOSED") return { themes: [], suggestions: [] };
  const ruleset = loadRuleset(rulesetId);
  const reachedIdx = STAGE_ORDER.indexOf(stage.toLowerCase());
  const all: Question[] = [];
  for (const [key, st] of Object.entries(ruleset.stages)) {
    if (STAGE_ORDER.indexOf(key) <= reachedIdx) all.push(...st.questions);
  }
  const answered = new Set(answeredQuestionIds);
  const coveredThemes = new Set(
    all.filter((q) => answered.has(q.id)).map((q) => q.theme),
  );
  const pending = all.filter(
    (q) => !answered.has(q.id) && !coveredThemes.has(q.theme),
  );
  const themes = [...new Set(pending.map((q) => q.theme))];
  return { themes, suggestions: pending.slice(0, 3) };
}

export function questionText(q: Question, locale: Locale): string {
  return q.text[locale] ?? q.text.fr;
}
