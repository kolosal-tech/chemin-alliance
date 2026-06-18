import type { AllianceStage } from "@prisma/client";
import { aiProvider } from "@/lib/env";
import { callLLM } from "@/lib/llm/gateway";
import type { Tier } from "@/lib/llm/matrix";
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

/**
 * Point d'entrée du coach IA.
 * 1. Garde-fou sujets sensibles -> redirection coach humain (AVANT tout LLM).
 * 2. Sinon passerelle LLM unique (matrice par étape, purge PII, opt-out de
 *    collecte, fallback en chaîne) ; toute panne retombe sur le fallback
 *    déterministe — jamais d'erreur technique exposée à l'utilisateur.
 */
export async function askCoach(
  question: string,
  opts: {
    stage: AllianceStage | null;
    locale: Locale;
    rulesetId?: string;
    country?: string;
    tier?: Tier;
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
  // Le coach relève de la Découverte (entrée) ou du Dialogue/Discernement.
  const step = opts.stage === "DISCOVERY" ? "discovery" : "dialogue";
  const text = await callLLM({
    system,
    user: question,
    step,
    // 512 tronquait les réponses structurées (listes de points) en plein
    // milieu. 1024 laisse de la marge pour un développement complet.
    maxTokens: 1024,
    tier: opts.tier,
  });
  if (text) return { text, guardrail: false, provider: aiProvider };

  return {
    text: fallbackResponse(question, opts.stage, opts.locale),
    guardrail: false,
    provider: "fallback",
  };
}
