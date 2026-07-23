import type { AllianceStage } from "@prisma/client";
import type { Locale } from "@/lib/core-engine";

/**
 * Agent 7 - Copilote du Coach Humain.
 * Résumé de parcours pour préparer une séance - UNIQUEMENT si les DEUX
 * membres ont donné le consentement COUPLE_COACH_SHARING (vérifié en amont).
 * N'inclut JAMAIS le contenu des messages privés : étape, thèmes couverts,
 * sujets à approfondir, durée. Visibilité COACH_ONLY, révocable.
 */
type CopilotSummaryInput = {
  stage: AllianceStage;
  sinceDays: number;
  coveredThemes: string[];
  openThemes: string[];
  compatibility: Array<{ key: string; status: string }>;
};

/**
 * Le modèle Consent courant ne sait pas persister ces quatre dimensions.
 * Tant qu'une migration dédiée ne les rend pas toutes vérifiables, la route
 * reste volontairement indisponible plutôt que d'inférer un consentement.
 */
export const REQUIRED_COACH_CONSENT_SCOPE = {
  relation: "MATCH",
  recipient: "VERIFIED_HUMAN_COACH",
  purpose: "SESSION_PREPARATION",
  version: "coach-sharing-v1",
} as const;

export const SCOPED_COACH_CONSENT_SUPPORTED = false;

export function deterministicSummary(
  input: CopilotSummaryInput,
  locale: Locale,
): string {
  const L: Record<Locale, [string, string, string, string, string]> = {
    fr: [
      "Étape actuelle",
      "depuis",
      "jours",
      "Thèmes déjà travaillés",
      "Sujets à approfondir en séance",
    ],
    en: [
      "Current stage",
      "for",
      "days",
      "Themes already worked on",
      "Topics to deepen in session",
    ],
    es: [
      "Etapa actual",
      "desde hace",
      "días",
      "Temas ya trabajados",
      "Temas a profundizar en sesión",
    ],
    pt: [
      "Etapa atual",
      "há",
      "dias",
      "Temas já trabalhados",
      "Temas a aprofundar em sessão",
    ],
  };
  const [stageL, sinceL, daysL, coveredL, openL] = L[locale];
  return [
    `${stageL}: ${input.stage} (${sinceL} ${input.sinceDays} ${daysL})`,
    `${coveredL}: ${input.coveredThemes.join(", ") || "-"}`,
    `${openL}: ${input.openThemes.join(", ") || "-"}`,
    input.compatibility.map((c) => `• ${c.key}: ${c.status}`).join("\n"),
  ].join("\n\n");
}
