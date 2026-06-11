import type { AllianceStage } from "@prisma/client";
import type { Locale } from "@/lib/core-engine";
import { completeText } from "./llm";

/**
 * Agent 7 — Copilote du Coach Humain.
 * Résumé de parcours pour préparer une séance — UNIQUEMENT si les DEUX
 * membres ont donné le consentement COUPLE_COACH_SHARING (vérifié en amont).
 * N'inclut JAMAIS le contenu des messages privés : étape, thèmes couverts,
 * sujets à approfondir, durée. Visibilité COACH_ONLY, révocable.
 */
export type CopilotSummaryInput = {
  stage: AllianceStage;
  sinceDays: number;
  coveredThemes: string[];
  openThemes: string[];
  compatibility: Array<{ key: string; status: string }>;
};

export function deterministicSummary(
  input: CopilotSummaryInput,
  locale: Locale,
): string {
  const L: Record<Locale, [string, string, string, string, string]> = {
    fr: ["Étape actuelle", "depuis", "jours", "Thèmes déjà travaillés", "Sujets à approfondir en séance"],
    en: ["Current stage", "for", "days", "Themes already worked on", "Topics to deepen in session"],
    es: ["Etapa actual", "desde hace", "días", "Temas ya trabajados", "Temas a profundizar en sesión"],
    pt: ["Etapa atual", "há", "dias", "Temas já trabalhados", "Temas a aprofundar em sessão"],
  };
  const [stageL, sinceL, daysL, coveredL, openL] = L[locale];
  return [
    `${stageL}: ${input.stage} (${sinceL} ${input.sinceDays} ${daysL})`,
    `${coveredL}: ${input.coveredThemes.join(", ") || "—"}`,
    `${openL}: ${input.openThemes.join(", ") || "—"}`,
    input.compatibility
      .map((c) => `• ${c.key}: ${c.status}`)
      .join("\n"),
  ].join("\n\n");
}

const SYSTEM = `Tu prépares une note de séance pour un accompagnateur de couple chrétien (coach, pasteur, conseiller).
À partir de données factuelles (étape, thèmes couverts, sujets ouverts), rédige une note
professionnelle de 6-8 lignes : où en est le couple, points d'appui, points d'attention,
2 pistes pour la séance. Tu ne cites aucun message privé. Ton neutre et bienveillant.`;

export async function polishSummary(
  input: CopilotSummaryInput,
  locale: Locale,
): Promise<string | null> {
  return completeText(
    `${SYSTEM}\nLangue: ${locale}.`,
    deterministicSummary(input, locale),
    500,
  );
}
