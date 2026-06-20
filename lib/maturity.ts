/**
 * Auto-bilan de maturité — « recto » : travail sur soi avant d'accueillir
 * l'autre (demande bêta : questionnaire franc au départ qui ORIENTE, jamais ne
 * bloque). Logique PURE et testée. Aucune écriture, aucune date.
 *
 * 6 axes, 1 affirmation par axe, évaluée sur une échelle partagée à 4 niveaux
 * (poids 0..3). Le rendu (libellés des axes et de l'échelle) vient de l'i18n ;
 * ici on ne manipule que des identifiants et des scores.
 *
 * v1 = restitution + orientation côté client (résultat gardé device-local).
 * L'intégration au moteur de matching (`lib/matching`) nécessiterait une
 * colonne persistée → migration ; volontairement HORS périmètre v1.
 */

export type MaturityAxis =
  | "motivation"
  | "past"
  | "faith"
  | "stability"
  | "vision"
  | "availability";

export const MATURITY_AXES: MaturityAxis[] = [
  "motivation",
  "past",
  "faith",
  "stability",
  "vision",
  "availability",
];

export const OPTIONS_PER_AXIS = 4; // échelle partagée : poids 0..3
const MAX_PER_AXIS = OPTIONS_PER_AXIS - 1; // 3

export type MaturityAnswers = Partial<Record<MaturityAxis, number>>;

export type MaturityLevel = "growing" | "preparing" | "ready";

export interface MaturityResult {
  perAxis: Record<MaturityAxis, number>; // 0..3 par axe
  total: number; // 0..100
  level: MaturityLevel;
  strengths: MaturityAxis[]; // poids >= 2
  growth: MaturityAxis[]; // poids <= 1
  /** Orientation douce : suggérer de prendre le temps (Méditer / coach). */
  suggestsPreparation: boolean;
}

function clampWeight(w: number | undefined): number {
  if (typeof w !== "number" || Number.isNaN(w)) return 0;
  return Math.max(0, Math.min(MAX_PER_AXIS, Math.round(w)));
}

/**
 * Calcule le profil de maturité. Pur. Réponses manquantes ou hors borne =
 * ramenées à 0..3. Bandes : ready ≥ 67, preparing 34..66, growing < 34.
 */
export function scoreMaturity(answers: MaturityAnswers): MaturityResult {
  const perAxis = {} as Record<MaturityAxis, number>;
  let sum = 0;
  for (const axis of MATURITY_AXES) {
    const w = clampWeight(answers[axis]);
    perAxis[axis] = w;
    sum += w;
  }
  const total = Math.round((sum / (MATURITY_AXES.length * MAX_PER_AXIS)) * 100);
  const level: MaturityLevel =
    total >= 67 ? "ready" : total >= 34 ? "preparing" : "growing";
  const strengths = MATURITY_AXES.filter((a) => perAxis[a] >= 2);
  const growth = MATURITY_AXES.filter((a) => perAxis[a] <= 1);
  return {
    perAxis,
    total,
    level,
    strengths,
    growth,
    // On encourage la préparation tant qu'on n'est pas pleinement prêt OU
    // qu'il reste un axe de croissance (jamais punitif : c'est une invitation).
    suggestsPreparation: level !== "ready" || growth.length > 0,
  };
}
