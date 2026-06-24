/**
 * Orchestration Alliance Lab (Vague 1).
 * - Reponses des personas (Echo IA) via la passerelle LLM unique (callLLM) : on
 *   herite ainsi du routage OpenRouter, de l'opt-out de collecte, de la purge
 *   PII, du verrou de langue et du ban du tiret cadratin. Le modele gratuit
 *   ":free" se configure au niveau gateway (OPENROUTER_MODEL ou LLM_MATRIX_JSON),
 *   PAS en dur ici : le service reste agnostique du modele.
 * - generatePastoralSynthesis : le Pasteur IA juge de fin de partie, qui capture
 *   la locale ET la region de l'utilisateur pour adapter le conseil de
 *   compatibilite aux codes culturels de son continent (geo-conscience).
 */
import type { AiPersona, GameType } from "@prisma/client";
import type { Locale } from "@/lib/core-engine";
import { callLLM } from "@/lib/llm/gateway";

// Codes culturels par continent, injectes dans le prompt du juge. Cle = champ
// `region` (personas + region IP captee cote utilisateur).
const REGION_CODES: Record<string, string> = {
  "west-africa":
    "Afrique de l'Ouest : poids et benediction des aines et de la famille elargie, validation communautaire, economie solidaire du foyer.",
  europe:
    "Europe : contexte urbain secularise, rythme rapide, recherche d'un foyer sanctuaire, foi vecue de maniere plus intime.",
  latam:
    "Amerique Latine : foi chaleureuse et expressive, priere spontanee, hospitalite et joie de la maison ouverte.",
  "north-america":
    "Amerique du Nord : pragmatisme, transparence budgetaire, planification de vie, engagements explicites.",
};

function regionHint(region: string | null | undefined): string {
  if (!region) return "";
  const code = REGION_CODES[region];
  return code ? `\n\nCodes culturels a respecter (${region}) : ${code}` : "";
}

export type AnswerPair = {
  questionKey: string;
  questionPrompt: string;
  userAnswer: string;
  personaAnswer?: string | null;
};

/**
 * Reponse d'une persona a une question (l'Echo IA repond a son tour).
 * Renvoie null si le LLM echoue (l'appelant gere le repli cote UI).
 */
export async function getPersonaReply(args: {
  persona: Pick<AiPersona, "systemPrompt" | "displayName">;
  gameType: GameType;
  questionPrompt: string;
  userAnswer: string;
  locale: Locale;
}): Promise<string | null> {
  const { persona, gameType, questionPrompt, userAnswer, locale } = args;
  const frame =
    gameType === "DISC"
      ? "C'est un jeu de profil DISC. Reagis brievement au choix de ton partenaire, puis dis ce que TOI tu choisirais et pourquoi, selon ta personnalite."
      : "C'est le jeu des Questions Profondes. Reponds a la question avec sincerite et pudeur, depuis ton vecu et ta culture.";

  return callLLM({
    system: persona.systemPrompt,
    user: `${frame}\n\nQuestion : ${questionPrompt}\n\nReponse de ton partenaire : ${userAnswer}`,
    step: "dialogue",
    tier: "standard",
    locale,
    maxTokens: 240,
  });
}

/** Decompte DISC simple a partir des codes choisis. */
export function scoreDisc(codes: Array<"D" | "I" | "S" | "C">): {
  D: number;
  I: number;
  S: number;
  C: number;
  dominant: "D" | "I" | "S" | "C" | null;
} {
  const tally = { D: 0, I: 0, S: 0, C: 0 };
  for (const c of codes) tally[c] += 1;
  const entries = Object.entries(tally) as Array<["D" | "I" | "S" | "C", number]>;
  const max = Math.max(...entries.map(([, n]) => n));
  const dominant = max > 0 ? (entries.find(([, n]) => n === max)?.[0] ?? null) : null;
  return { ...tally, dominant };
}

/**
 * Juge de fin de partie : le Pasteur IA redige une synthese de compatibilite
 * SUR MESURE, adaptee a la locale et au continent de l'utilisateur.
 */
export async function generatePastoralSynthesis(args: {
  gameType: GameType;
  answers: AnswerPair[];
  personaName: string;
  locale: Locale;
  region?: string | null;
  premium?: boolean;
}): Promise<string | null> {
  const { gameType, answers, personaName, locale, region, premium } = args;

  const transcript = answers
    .map(
      (a, i) =>
        `${i + 1}. ${a.questionPrompt}\n   - Utilisateur : ${a.userAnswer}` +
        (a.personaAnswer ? `\n   - ${personaName} : ${a.personaAnswer}` : ""),
    )
    .join("\n");

  const system =
    "Tu es le Pasteur IA de Chemin d'Alliance : un accompagnateur chretien sage, doux et concret. Tu rediges une courte synthese pastorale (pas un score, pas un verdict) qui eclaire des points de compatibilite et des sujets a approfondir. Tu restes humble : tu invites au dialogue reel, jamais tu ne remplaces le discernement du couple." +
    regionHint(region);

  const kind =
    gameType === "DISC"
      ? "Ce jeu etait un profil DISC (personnalites)."
      : "Ce jeu etait un echange de Questions Profondes.";

  const user = `${kind}\n\nVoici les echanges de la partie :\n${transcript}\n\nRedige une synthese pastorale en 3 courts paragraphes : 1) une force ou un point d'accord, 2) un sujet a approfondir ensemble avec douceur, 3) une invitation concrete a en parler. Adapte le ton et les references aux codes culturels indiques.`;

  // step "dialogue" (analyse de compatibilite / croisement des visions) plutot
  // qu'"accompaniment" : meilleur fit semantique ET routage fiable (gemini en
  // standard, sonnet en premium). Le modele d'accompagnement par defaut
  // (deepseek) timeoutait souvent sur ce type de synthese.
  return callLLM({
    system,
    user,
    step: "dialogue",
    tier: premium ? "premium" : "optimal",
    locale,
    maxTokens: 600,
  });
}
