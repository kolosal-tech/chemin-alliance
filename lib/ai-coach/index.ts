import type { AllianceStage } from "@prisma/client";
import { aiProvider, env } from "@/lib/env";
import type { Locale } from "@/lib/core-engine";
import { fallbackResponse } from "./fallback";
import { guardrailResponse, isSensitiveTopic, SYSTEM_PROMPT } from "./guardrails";

export const DAILY_FREE_LIMIT = 5;

export type CoachReply = {
  text: string;
  guardrail: boolean;
  provider: "anthropic" | "openrouter" | "openai" | "fallback";
};

function systemPrompt(stage: AllianceStage | null, locale: Locale): string {
  return `${SYSTEM_PROMPT}\nLangue de réponse: ${locale}. Étape actuelle: ${stage ?? "aucune"}.`;
}

/** Appel Anthropic Messages API. */
async function askAnthropic(
  question: string,
  system: string,
): Promise<string | null> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system,
      messages: [{ role: "user", content: question }],
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    content: Array<{ type: string; text?: string }>;
  };
  return data.content.find((c) => c.type === "text")?.text ?? null;
}

/**
 * Appel OpenAI-compatible (OpenRouter ou OpenAI).
 * OpenRouter : https://openrouter.ai/api/v1 — modèle via OPENROUTER_MODEL.
 */
async function askOpenAiCompatible(
  baseUrl: string,
  apiKey: string,
  model: string,
  question: string,
  system: string,
): Promise<string | null> {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
      // En-têtes d'attribution recommandés par OpenRouter (facultatifs)
      "HTTP-Referer": env.APP_URL,
      "X-Title": "Chemin d'Alliance",
    },
    body: JSON.stringify({
      model,
      max_tokens: 512,
      messages: [
        { role: "system", content: system },
        { role: "user", content: question },
      ],
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content ?? null;
}

/**
 * Point d'entrée du coach IA.
 * 1. Guardrail sujets sensibles -> redirection coach humain (toujours, même avec LLM).
 * 2. LLM si clé fournie (priorité : Anthropic > OpenRouter > OpenAI),
 *    sinon fallback scripté. Toute panne LLM retombe sur le fallback —
 *    jamais d'erreur technique exposée à l'utilisateur.
 */
export async function askCoach(
  question: string,
  opts: { stage: AllianceStage | null; locale: Locale },
): Promise<CoachReply> {
  if (isSensitiveTopic(question)) {
    return { ...guardrailResponse(opts.locale), provider: aiProvider };
  }

  const system = systemPrompt(opts.stage, opts.locale);
  try {
    let text: string | null = null;
    if (aiProvider === "anthropic") {
      text = await askAnthropic(question, system);
    } else if (aiProvider === "openrouter") {
      text = await askOpenAiCompatible(
        "https://openrouter.ai/api/v1",
        env.OPENROUTER_API_KEY!,
        env.OPENROUTER_MODEL,
        question,
        system,
      );
    } else if (aiProvider === "openai") {
      text = await askOpenAiCompatible(
        "https://api.openai.com/v1",
        env.OPENAI_API_KEY!,
        "gpt-4o-mini",
        question,
        system,
      );
    }
    if (text) return { text, guardrail: false, provider: aiProvider };
  } catch {
    // panne LLM -> fallback silencieux
  }

  return {
    text: fallbackResponse(question, opts.stage, opts.locale),
    guardrail: false,
    provider: "fallback",
  };
}
