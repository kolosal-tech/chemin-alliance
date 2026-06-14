import { aiProvider, env } from "@/lib/env";
import { redactPII } from "./redaction";
import { resolveModels, type Step, type Tier } from "./matrix";
import { recordLlmCall } from "./telemetry";

// Passerelle LLM unique : tous les agents et le Coach IA passent par ici.
// Garanties (document d'architecture LLM) :
//  - matrice multi-modèles par étape × palier (via OpenRouter),
//  - opt-out de collecte des données ("provider.data_collection":"deny"),
//  - purge des PII (coordonnées) AVANT envoi à un modèle tiers,
//  - fallback EN CHAÎNE : on essaie les modèles dans l'ordre, puis l'appelant
//    bascule sur son fallback déterministe (null) si tout échoue,
//  - timeout par appel (AbortController) — aucune erreur exposée à l'utilisateur,
//  - télémétrie par appel (coût/latence/fallback) sans aucune donnée perso.

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

type Usage = { prompt: number | null; completion: number | null };
type LlmResult = { text: string | null; usage: Usage };

const NO_USAGE: Usage = { prompt: null, completion: null };

async function withTimeout<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  onError: T,
): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fn(ctrl.signal);
  } catch {
    return onError;
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
): Promise<LlmResult> {
  return withTimeout(
    async (signal) => {
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
      if (!res.ok) return { text: null, usage: NO_USAGE };
      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };
      return {
        text: data.choices?.[0]?.message?.content?.trim() || null,
        usage: {
          prompt: data.usage?.prompt_tokens ?? null,
          completion: data.usage?.completion_tokens ?? null,
        },
      };
    },
    { text: null, usage: NO_USAGE },
  );
}

async function anthropic(
  model: string,
  system: string,
  user: string,
  maxTokens: number,
): Promise<LlmResult> {
  return withTimeout(
    async (signal) => {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        signal,
        headers: {
          "content-type": "application/json",
          "x-api-key": env.ANTHROPIC_API_KEY!,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          system,
          messages: [{ role: "user", content: user }],
        }),
      });
      if (!res.ok) return { text: null, usage: NO_USAGE };
      const data = (await res.json()) as {
        content: Array<{ type: string; text?: string }>;
        usage?: { input_tokens?: number; output_tokens?: number };
      };
      return {
        text: data.content.find((c) => c.type === "text")?.text?.trim() || null,
        usage: {
          prompt: data.usage?.input_tokens ?? null,
          completion: data.usage?.output_tokens ?? null,
        },
      };
    },
    { text: null, usage: NO_USAGE },
  );
}

const ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";
const OPENAI_MODEL = "gpt-4o-mini";

export async function callLLM(req: LlmRequest): Promise<string | null> {
  if (aiProvider === "fallback") return null;

  const maxTokens = req.maxTokens ?? 700;
  const tier = req.tier ?? "standard";

  // Purge PII avant tout envoi tiers (on conserve le compte pour la télémétrie).
  const redact = req.redact ?? true;
  const rs = redact ? redactPII(req.system) : { text: req.system, count: 0 };
  const ru = redact ? redactPII(req.user) : { text: req.user, count: 0 };
  const system = rs.text;
  const user = ru.text;
  const redactedPii = rs.count + ru.count;

  const started = Date.now();
  let result: LlmResult = { text: null, usage: NO_USAGE };
  let model: string | null = null;
  let attempts = 0;

  if (aiProvider === "anthropic") {
    // Anthropic 1P : canal direct (pas de tiers), pas de matrice OpenRouter.
    attempts = 1;
    model = ANTHROPIC_MODEL;
    result = await anthropic(ANTHROPIC_MODEL, system, user, maxTokens);
  } else if (aiProvider === "openrouter") {
    // OpenRouter : matrice multi-modèles + opt-out de collecte des données.
    for (const m of resolveModels(req.step, tier)) {
      attempts++;
      const r = await openAiCompatible(
        "https://openrouter.ai/api/v1",
        env.OPENROUTER_API_KEY!,
        m,
        system,
        user,
        maxTokens,
        { provider: { data_collection: "deny" } },
      );
      if (r.text) {
        result = r;
        model = m;
        break;
      }
    }
  } else if (aiProvider === "openai") {
    // OpenAI direct (palier de repli).
    attempts = 1;
    model = OPENAI_MODEL;
    result = await openAiCompatible(
      "https://api.openai.com/v1",
      env.OPENAI_API_KEY!,
      OPENAI_MODEL,
      system,
      user,
      maxTokens,
      {},
    );
  }

  const ok = Boolean(result.text);
  recordLlmCall({
    step: req.step,
    tier,
    provider: aiProvider,
    model: ok ? model : null,
    ok,
    fallback: !ok,
    latencyMs: Date.now() - started,
    attempts,
    promptTokens: result.usage.prompt,
    completionTokens: result.usage.completion,
    redactedPii,
  });

  return result.text;
}
