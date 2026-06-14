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

// Modèles vérifiés sur OpenRouter (juin 2026) : tous répondent proprement
// (non-reasoning, finish_reason=stop) AVEC l'opt-out de collecte. Les choix du
// fondateur ont été adaptés aux slugs réellement disponibles : claude-3.5-sonnet
// -> claude-sonnet-4.6 ; gemini-2.0-pro-exp -> gemini-2.5-flash (1M ctx, value) ;
// deepseek-v4-pro (reasoning, contenu vide) -> deepseek-chat-v3.1 ;
// qwen-3.5-flash -> qwen3-30b-a3b-instruct-2507.
const DOC_MATRIX: Matrix = {
  // Découverte : brise-glace, rédaction authentique, agilité multilingue/culturelle.
  discovery: {
    standard: ["qwen/qwen3-30b-a3b-instruct-2507"],
    optimal: ["qwen/qwen3-30b-a3b-instruct-2507"],
    premium: ["anthropic/claude-sonnet-4.6"],
  },
  // Dialogue & Discernement : analyse de compatibilité, croisement des visions.
  // Optimal = gros contexte à moindre coût ; Premium = nuance et finesse maximales.
  dialogue: {
    standard: ["google/gemini-2.5-flash"],
    optimal: ["google/gemini-2.5-flash"],
    premium: ["anthropic/claude-sonnet-4.6"],
  },
  // Accompagnement : synthèse croisée, points de vigilance, suivi d'instructions
  // strictes (rigueur). Premium = synthèse la plus nuancée.
  accompaniment: {
    standard: ["deepseek/deepseek-chat-v3.1"],
    optimal: ["deepseek/deepseek-chat-v3.1"],
    premium: ["anthropic/claude-sonnet-4.6"],
  },
  // Sécurité & modération : structuré, rigoureux, fiable sur les System Prompts.
  // Toujours le meilleur disponible, indépendamment du palier (jamais derrière un paywall).
  safety: {
    standard: ["deepseek/deepseek-chat-v3.1"],
    optimal: ["deepseek/deepseek-chat-v3.1"],
    premium: ["deepseek/deepseek-chat-v3.1"],
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
  return [...list, proven].filter(
    (m, i, a) => Boolean(m) && a.indexOf(m) === i,
  );
}
