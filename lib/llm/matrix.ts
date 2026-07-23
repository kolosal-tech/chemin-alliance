import { z } from "zod";
import { safeErrorDetails } from "@/lib/security/safe-error";
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

// Schéma de validation de LLM_MATRIX_JSON (surcharge optionnelle de la
// matrice). Une étape/palier peut être omis (le fallback DOC_MATRIX/proven
// s'applique), mais la FORME de ce qui est fourni doit être correcte : un
// Record<Step, Record<Tier, string[]>>, avec des slugs de modèles non vides.
const stepEnum = z.enum(["discovery", "dialogue", "accompaniment", "safety"]);
const tierEnum = z.enum(["standard", "optimal", "premium"]);
const openRouterModelSlugSchema = z
  .string()
  .trim()
  .min(3)
  .max(160)
  .regex(
    /^(?!sk-|key-|secret-|token-)[a-z0-9][a-z0-9._-]{0,47}\/[a-z0-9][a-z0-9._:+-]{0,110}$/,
    "slug OpenRouter attendu sous la forme publisher/model",
  );

export function isValidOpenRouterModelSlug(value: string): boolean {
  return openRouterModelSlugSchema.safeParse(value).success;
}
// partialRecord (et non record) : une surcharge peut ne fournir qu'un
// sous-ensemble des étapes/paliers - le reste retombe sur DOC_MATRIX/proven.
const matrixSchema = z.partialRecord(
  stepEnum,
  z.partialRecord(tierEnum, z.array(openRouterModelSlugSchema)),
);

function loadMatrix(): Matrix {
  const raw = process.env.LLM_MATRIX_JSON;
  if (!raw) return DOC_MATRIX;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    console.error(
      "[llm/matrix] LLM_MATRIX_JSON n'est pas un JSON valide, repli sur la matrice par défaut.",
      safeErrorDetails(err),
    );
    return DOC_MATRIX;
  }
  const result = matrixSchema.safeParse(parsed);
  if (!result.success) {
    console.error(
      "[llm/matrix] LLM_MATRIX_JSON a une forme invalide (attendu Record<Step, Record<Tier, string[]>>), repli sur la matrice par défaut :",
      result.error.issues
        .map((i) => `${i.path.join(".") || "<racine>"}: ${i.message}`)
        .join("; "),
    );
    return DOC_MATRIX;
  }
  const override = result.data;
  return {
    discovery: { ...DOC_MATRIX.discovery, ...override.discovery },
    dialogue: { ...DOC_MATRIX.dialogue, ...override.dialogue },
    accompaniment: {
      ...DOC_MATRIX.accompaniment,
      ...override.accompaniment,
    },
    safety: { ...DOC_MATRIX.safety, ...override.safety },
  };
}

const MATRIX = loadMatrix();
const ALL_STEPS: readonly Step[] = [
  "discovery",
  "dialogue",
  "accompaniment",
  "safety",
];
const ALL_TIERS: readonly Tier[] = ["standard", "optimal", "premium"];

/**
 * Liste ordonnée des modèles à essayer pour (étape, palier).
 * Le modèle éprouvé (env) est ajouté en dernier ressort pour garantir une
 * réponse même si un modèle du document est indisponible chez OpenRouter.
 */
export function resolveModels(step: Step, tier: Tier): string[] {
  const provenResult = openRouterModelSlugSchema.safeParse(
    env.OPENROUTER_MODEL,
  );
  const proven = provenResult.success ? provenResult.data : null;
  const list = MATRIX?.[step]?.[tier] ?? [];
  return [...list, ...(proven ? [proven] : [])].filter(
    (m, i, a) => Boolean(m) && a.indexOf(m) === i,
  );
}

/**
 * Ensemble exact de tous les modèles susceptibles de recevoir une requête via
 * OpenRouter avec la configuration chargée par ce processus.
 */
export function resolveAllOpenRouterModels(): string[] {
  return [
    ...new Set(
      ALL_STEPS.flatMap((step) =>
        ALL_TIERS.flatMap((tier) => resolveModels(step, tier)),
      ),
    ),
  ].sort((left, right) => left.localeCompare(right));
}

/**
 * Palier LLM d'un utilisateur depuis son état d'abonnement (`User.subscriptionStatus`,
 * source de vérité mise à jour par le webhook Stripe). « active » -> premium ;
 * sinon standard. Aligné sur `getUserPlan` / `canAccess("premium_llm_tier")`.
 * La Sécurité reste sur le meilleur modèle quel que soit le palier (jamais payante).
 */
export function tierForSubscription(
  subscriptionStatus: string | null | undefined,
): Tier {
  return subscriptionStatus === "active" ? "premium" : "standard";
}
