import type { AllianceStage } from "@prisma/client";
import { aiProvider, env } from "@/lib/env";
import { loadRuleset, type Locale } from "@/lib/core-engine";
import { culturalGuidance } from "@/lib/culture";
import { fallbackResponse } from "./fallback";
import {
  guardrailResponse,
  isSensitiveTopic,
  SYSTEM_PROMPT,
} from "./guardrails";

export const DAILY_FREE_LIMIT = 5;

export type CoachReply = {
  text: string;
  guardrail: boolean;
  provider: "anthropic" | "openrouter" | "openai" | "fallback";
};

// Registre de langage : maîtrise biblique/religieuse + sensibilité
// coutumière et culturelle, dans le respect strict des garde-fous.
const REGISTER_PROMPT = `MAÎTRISE DU LANGAGE :
- Langage biblique et religieux : tu peux éclairer une réflexion par un principe ou un thème scripturaire chrétien (alliance, amour, fidélité, pardon, patience), avec sobriété. Tu n'imposes pas de versets hors contexte et tu ne prophétises jamais (cf. règle 2).
- Langage coutumier et culturel : selon les cultures, le chemin vers le mariage engage la famille élargie et des étapes coutumières (présentation aux familles, dot/coutume) en plus du civil et du religieux. Respecte et intègre le cadre culturel de la personne sans présumer d'une seule culture ; au besoin, demande-lui son contexte.
- Vocabulaire de sa tradition : emploie les mots justes de la tradition de la personne (voir ci-dessous).`;

/** Injecte le vocabulaire et les rôles cléricaux de la tradition de la personne. */
function doctrineContext(
  rulesetId: string | undefined,
  locale: Locale,
): string {
  if (!rulesetId) return "";
  let ruleset;
  try {
    ruleset = loadRuleset(rulesetId);
  } catch {
    return "";
  }
  const voc = ruleset.vocabulary ?? {};
  const leader = voc.spiritual_leader?.[locale] ?? voc.spiritual_leader?.fr;
  const community = voc.local_community?.[locale] ?? voc.local_community?.fr;
  const lines = [`Tradition de la personne : ${ruleset.name}.`];
  if (leader) lines.push(`Responsable spirituel : dis « ${leader} ».`);
  if (community) lines.push(`Communauté locale : dis « ${community} ».`);
  if (ruleset.clergy_roles?.length) {
    lines.push(
      `Accompagnateurs humains de référence : ${ruleset.clergy_roles.join(", ")}.`,
    );
  }
  return "TRADITION DE LA PERSONNE :\n" + lines.join("\n");
}

function systemPrompt(
  stage: AllianceStage | null,
  locale: Locale,
  rulesetId?: string,
  country?: string,
): string {
  return [
    SYSTEM_PROMPT,
    REGISTER_PROMPT,
    doctrineContext(rulesetId, locale),
    culturalGuidance(country),
    `Langue de réponse: ${locale}. Étape actuelle: ${stage ?? "aucune"}.`,
  ]
    .filter(Boolean)
    .join("\n\n");
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
  // Les modèles "reasoning" peuvent renvoyer un contenu vide : traiter comme échec.
  const content = data.choices?.[0]?.message?.content?.trim();
  return content || null;
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
  opts: {
    stage: AllianceStage | null;
    locale: Locale;
    rulesetId?: string;
    country?: string;
  },
): Promise<CoachReply> {
  if (isSensitiveTopic(question)) {
    return { ...guardrailResponse(opts.locale), provider: aiProvider };
  }

  const system = systemPrompt(
    opts.stage,
    opts.locale,
    opts.rulesetId,
    opts.country,
  );
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
