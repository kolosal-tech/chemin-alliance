// Télémétrie LLM - observabilité coût / latence / fiabilité de la passerelle.
//
// Émet UNE ligne JSON structurée par appel (captée par les logs Vercel / un
// drain). PRIVACY : aucune donnée personnelle, aucun contenu de prompt, aucun
// userId - uniquement des MÉTADONNÉES (étape, palier, modèle, latence, nombre
// de tokens, fallback). Le pilotage du coût des modèles payants se fait sur ces
// agrégats sans jamais exposer qui a parlé à l'IA ni de quoi.
//
// Sur Vercel serverless, un agrégat en mémoire serait trompeur (isolats
// éphémères) : la source durable est le log structuré, agrégé en aval.

export type LlmTelemetryEvent = {
  /** Étape du parcours (discovery/dialogue/accompaniment/safety). */
  step: string;
  /** Palier d'abonnement (standard/optimal/premium). */
  tier: string;
  /** Fournisseur effectif (openrouter/anthropic/openai/fallback). */
  provider: string;
  /** Modèle ayant répondu, ou null si tous ont échoué. */
  model: string | null;
  /** Réponse obtenue d'un modèle. */
  ok: boolean;
  /** Aucun modèle n'a répondu -> l'appelant bascule sur son fallback. */
  fallback: boolean;
  /** Latence totale de l'appel (ms). */
  latencyMs: number;
  /** Nombre de modèles essayés avant de répondre / d'abandonner. */
  attempts: number;
  /** Tokens du prompt, si le fournisseur les renvoie. */
  promptTokens: number | null;
  /** Tokens de la complétion, si le fournisseur les renvoie. */
  completionTokens: number | null;
  /** Nombre de PII masquées avant envoi tiers (qualité de la purge). */
  redactedPii: number;
};

type Sink = (event: LlmTelemetryEvent) => void;

// Défaut : une ligne JSON sur stdout, préfixée pour le filtrage des logs.
let sink: Sink = (event) => {
  console.log(`[llm-telemetry] ${JSON.stringify(event)}`);
};

/** Remplace le puits (tests, ou branchement futur sur un drain/DB). */
export function setLlmTelemetrySink(next: Sink): void {
  sink = next;
}

/** Enregistre un appel LLM. Renvoie l'événement (pratique pour les tests). */
export function recordLlmCall(event: LlmTelemetryEvent): LlmTelemetryEvent {
  try {
    sink(event);
  } catch {
    // La télémétrie ne doit JAMAIS faire échouer un appel LLM.
  }
  return event;
}
