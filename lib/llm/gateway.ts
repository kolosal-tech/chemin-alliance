import { aiProvider, env } from "@/lib/env";
import { redactPII } from "./redaction";
import { resolveModels, type Step, type Tier } from "./matrix";

// Passerelle LLM unique : tous les agents et le Coach IA passent par ici.
// Garanties (document d'architecture LLM) :
//  - matrice multi-modèles par étape × palier (via OpenRouter),
//  - opt-out de collecte des données ("provider.data_collection":"deny"),
//  - purge des PII (coordonnées) AVANT envoi à un modèle tiers,
//  - fallback EN CHAÎNE : on essaie les modèles dans l'ordre, puis l'appelant
//    bascule sur son fallback déterministe (null) si tout échoue,
//  - timeout par appel (AbortController) — aucune erreur exposée à l'utilisateur.

const TIMEOUT_MS = 20000;

export type LlmRequest = {
  system: string;
  user: string;
  step: Step;
  tier?: Tier;
  maxTokens?: number;
  /** Purge PII avant envoi tiers (défaut: true). */
  redact?: boolean;
};

async function withTimeout<T>(
  fn: (signal: AbortSignal) => Promise<T>,
): Promise<T | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fn(ctrl.signal);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function openAiCompatible(
  base: string,
  key: string,
  model: string,
  system: string,
  user: string,
  maxTokens: number,
  extraBody: Record<string, unknown>,
): Promise<string | null> {
  return withTimeout(async (signal) => {
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      signal,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${key}`,
        "HTTP-Referer": env.APP_URL,
        "X-Title": "Chemin d'Alliance",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        ...extraBody,
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return data.choices?.[0]?.message?.content?.trim() || null;
  });
}

async function anthropic(
  system: string,
  user: string,
  maxTokens: number,
): Promise<string | null> {
  return withTimeout(async (signal) => {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      content: Array<{ type: string; text?: string }>;
    };
    return data.content.find((c) => c.type === "text")?.text?.trim() || null;
  });
}

export async function callLLM(req: LlmRequest): Promise<string | null> {
  if (aiProvider === "fallback") return null;

  const maxTokens = req.maxTokens ?? 700;
  const tier = req.tier ?? "standard";

  // Purge PII avant tout envoi tiers.
  const redact = req.redact ?? true;
  const system = redact ? redactPII(req.system).text : req.system;
  const user = redact ? redactPII(req.user).text : req.user;

  // Anthropic 1P : canal direct (pas de tiers), pas de matrice OpenRouter.
  if (aiProvider === "anthropic") {
    return anthropic(system, user, maxTokens);
  }

  // OpenRouter : matrice multi-modèles + opt-out de collecte des données.
  if (aiProvider === "openrouter") {
    for (const model of resolveModels(req.step, tier)) {
      const text = await openAiCompatible(
        "https://openrouter.ai/api/v1",
        env.OPENROUTER_API_KEY!,
        model,
        system,
        user,
        maxTokens,
        { provider: { data_collection: "deny" } },
      );
      if (text) return text;
    }
    return null;
  }

  // OpenAI direct (palier de repli).
  if (aiProvider === "openai") {
    return openAiCompatible(
      "https://api.openai.com/v1",
      env.OPENAI_API_KEY!,
      "gpt-4o-mini",
      system,
      user,
      maxTokens,
      {},
    );
  }

  return null;
}
