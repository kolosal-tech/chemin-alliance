import { createHash } from "node:crypto";
import { aiProvider, env, isValidOpenRouterProviderSlug } from "@/lib/env";
import {
  isValidOpenRouterModelSlug,
  resolveAllOpenRouterModels,
} from "@/lib/llm/matrix";

export const DIRECT_ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";
export const DIRECT_OPENAI_MODEL = "gpt-4o-mini";
export const OPENROUTER_ROUTING_POLICY = Object.freeze({
  allow_fallbacks: false as const,
  data_collection: "deny" as const,
  zdr: true as const,
});

export type AiProvider = typeof aiProvider;

export type OpenRouterRoutingScope = Readonly<{
  only: readonly string[];
  allow_fallbacks: false;
  data_collection: "deny";
  zdr: true;
}>;

export type AiRecipientScope = Readonly<{
  fingerprint: string;
  provider: AiProvider;
  recipients: readonly string[];
  models: readonly string[];
  operators: readonly string[];
  routing: OpenRouterRoutingScope | null;
  summary: string;
}>;

function canonicalStrings(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function fingerprintScope(
  provider: AiProvider,
  recipients: readonly string[],
  models: readonly string[],
  routing: OpenRouterRoutingScope | null,
): string {
  const canonical = JSON.stringify({
    schema: "ai-recipient-scope.v2",
    provider,
    recipients: canonicalStrings(recipients),
    models: canonicalStrings(models),
    routing,
  });
  return `sha256:${createHash("sha256").update(canonical).digest("hex")}`;
}

function recipientSummary(
  provider: AiProvider,
  operators: readonly string[],
): string {
  if (provider === "fallback") return "LOCAL_ONLY";
  if (provider === "anthropic") return "Anthropic · Claude Haiku 4.5";
  if (provider === "openai") return "OpenAI · GPT-4o mini";
  return ["OpenRouter", ...operators].join(" · ");
}

/**
 * Construit le périmètre exact sans exposer les slugs de modèles dans le DTO.
 *
 * Le fingerprint couvre néanmoins chaque modèle effectif. Ajouter, retirer ou
 * remplacer un modèle invalide donc automatiquement tout ancien consentement.
 */
export function buildAiRecipientScope(
  provider: AiProvider,
  openRouterModels: readonly string[] = [],
  openRouterOperators: readonly string[] = [],
): AiRecipientScope {
  let models: string[];
  let recipients: string[];
  let operators: string[] = [];
  let routing: OpenRouterRoutingScope | null = null;

  if (provider === "anthropic") {
    models = [`anthropic/${DIRECT_ANTHROPIC_MODEL}`];
    recipients = ["provider:anthropic"];
  } else if (provider === "openai") {
    models = [`openai/${DIRECT_OPENAI_MODEL}`];
    recipients = ["provider:openai"];
  } else if (provider === "openrouter") {
    const normalizedModels = openRouterModels.map((model) => model.trim());
    if (normalizedModels.some((model) => !isValidOpenRouterModelSlug(model))) {
      throw new Error("INVALID_OPENROUTER_RECIPIENT_SCOPE");
    }
    const normalizedOperators = openRouterOperators.map((operator) =>
      operator.trim().toLowerCase(),
    );
    if (
      normalizedOperators.length === 0 ||
      normalizedOperators.some(
        (operator) => !isValidOpenRouterProviderSlug(operator),
      )
    ) {
      throw new Error("INVALID_OPENROUTER_PROVIDER_ALLOWLIST");
    }
    models = canonicalStrings(normalizedModels);
    operators = canonicalStrings(normalizedOperators);
    recipients = canonicalStrings([
      "intermediary:openrouter",
      ...operators.map((operator) => `inference-operator:${operator}`),
    ]);
    routing = Object.freeze({
      only: Object.freeze([...operators]),
      ...OPENROUTER_ROUTING_POLICY,
    });
  } else {
    models = [];
    recipients = ["processor:local"];
  }

  const fingerprint = fingerprintScope(provider, recipients, models, routing);
  return Object.freeze({
    fingerprint,
    provider,
    recipients: Object.freeze(recipients),
    models: Object.freeze(models),
    operators: Object.freeze(operators),
    routing,
    summary: recipientSummary(provider, operators),
  });
}

/** Périmètre réellement actif dans ce processus serveur. */
export function currentAiRecipientScope(): AiRecipientScope {
  return buildAiRecipientScope(
    aiProvider,
    aiProvider === "openrouter" ? resolveAllOpenRouterModels() : [],
    aiProvider === "openrouter" ? (env.OPENROUTER_ALLOWED_PROVIDERS ?? []) : [],
  );
}
