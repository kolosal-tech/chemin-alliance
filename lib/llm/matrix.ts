import { env } from "@/lib/env";

// Matrice de modèles par ÉTAPE du parcours × PALIER d'abonnement, via OpenRouter.
// Conforme au document d'architecture LLM du fondateur. Surchargeable par la
// variable d'env LLM_MATRIX_JSON pour pivoter sans redéploiement.
//
// Le palier "standard" reste volontairement sur le modèle éprouvé (env
// OPENROUTER_MODEL) pour préserver exactement le comportement actuel ; les
// paliers "optimal" et "premium" activent les modèles plus fins du document.
// resolveModels() termine TOUJOURS par le modèle éprouvé (résilience).

export type Step = "discovery" | "dialogue" | "accompaniment" | "safety";
export type Tier = "standard" | "optimal" | "premium";

type Matrix = Record<Step, Record<Tier, string[]>>;

const DOC_MATRIX: Matrix = {
  discovery: {
    standard: [],
    optimal: ["google/gemini-2.0-flash-001"],
    premium: ["anthropic/claude-3.5-sonnet"],
  },
  dialogue: {
    standard: [],
    optimal: ["google/gemini-2.0-flash-001"],
    premium: ["anthropic/claude-3.5-sonnet"],
  },
  accompaniment: {
    standard: [],
    optimal: ["deepseek/deepseek-chat"],
    premium: ["anthropic/claude-3.5-sonnet"],
  },
  // Sécurité & modération : toujours le meilleur disponible, indépendamment du
  // palier payé (la sécurité n'est jamais derrière un paywall).
  safety: {
    standard: ["openai/gpt-4o-mini"],
    optimal: ["openai/gpt-4o-mini"],
    premium: ["openai/gpt-4o"],
  },
};

function loadMatrix(): Matrix {
  const raw = process.env.LLM_MATRIX_JSON;
  if (raw) {
    try {
      return JSON.parse(raw) as Matrix;
    } catch {
      // JSON invalide -> matrice par défaut.
    }
  }
  return DOC_MATRIX;
}

const MATRIX = loadMatrix();

/**
 * Liste ordonnée des modèles à essayer pour (étape, palier).
 * Le modèle éprouvé (env) est ajouté en dernier ressort pour garantir une
 * réponse même si un modèle du document est indisponible chez OpenRouter.
 */
export function resolveModels(step: Step, tier: Tier): string[] {
  const proven = env.OPENROUTER_MODEL;
  const list = MATRIX?.[step]?.[tier] ?? [];
  return [...list, proven].filter((m, i, a) => Boolean(m) && a.indexOf(m) === i);
}
