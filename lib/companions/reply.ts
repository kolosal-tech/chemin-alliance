import { callLLM, type LlmTurn } from "@/lib/llm/gateway";
import type { Locale } from "@/lib/core-engine";

/**
 * Reponse automatique d'un Compagnon IA dans un fil de messagerie.
 *
 * Le `systemPrompt` provient de AiCompanionMeta (seede par prisma/seed-ecosystem)
 * et contient deja POSTURE (transparence : "je ne suis pas une vraie personne")
 * + sensibilite culturelle + POLYGLOT_ANCHOR + bannissement du tiret cadratin.
 * On le passe tel quel a la passerelle unique callLLM, qui re-injecte le ban
 * tiret + le verrou de langue (LANG_LOCK) selon la locale de l'utilisateur.
 *
 * step "dialogue" => modele rapide et fiable (gemini flash). On evite
 * "accompaniment" qui timeoutait a 20 s. Reponses courtes (2 a 4 phrases),
 * d'ou un maxTokens volontairement bas. Retourne null si tous les modeles
 * echouent : l'appelant decide alors d'un repli localise (jamais de silence).
 */
export async function generateCompanionReply(opts: {
  systemPrompt: string;
  locale: Locale;
  userMessage: string;
  history?: LlmTurn[];
}): Promise<string | null> {
  return callLLM({
    system: opts.systemPrompt,
    user: opts.userMessage,
    step: "dialogue",
    maxTokens: 400,
    locale: opts.locale,
    history: opts.history,
  });
}
