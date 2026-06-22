import { z } from "zod";
import type { Locale } from "@/lib/core-engine";
import { completeJson } from "./llm";

/**
 * Agent 1 - Compagnon de Préparation.
 * Entretien d'accueil -> Portrait de Préparation (5 dimensions QUALITATIVES,
 * jamais un score) -> orientation douce. L'agent ne bloque JAMAIS l'accès :
 * il propose, la personne choisit, un humain valide tout effet d'accès.
 */
export const DIMENSIONS = [
  "spiritualRooting",
  "emotionalStability",
  "intentionClarity",
  "supportNetwork",
  "lifeAvailability",
] as const;
export type Dimension = (typeof DIMENSIONS)[number];

export const INTERVIEW_QUESTIONS: Array<{
  id: string;
  dimension: Dimension;
  text: Record<Locale, string>;
}> = [
  {
    id: "prep_faith",
    dimension: "spiritualRooting",
    text: {
      fr: "Raconte-moi ta vie de foi aujourd'hui : prière, communauté, ce qui te porte.",
      en: "Tell me about your faith life today: prayer, community, what carries you.",
      es: "Cuéntame tu vida de fe hoy: oración, comunidad, lo que te sostiene.",
      pt: "Conte-me a sua vida de fé hoje: oração, comunidade, o que o/a sustenta.",
    },
  },
  {
    id: "prep_season",
    dimension: "emotionalStability",
    text: {
      fr: "Dans quelle saison de vie es-tu ? Y a-t-il une blessure récente (rupture, deuil) encore vive ?",
      en: "What season of life are you in? Is there a recent wound (breakup, loss) still raw?",
      es: "¿En qué etapa de vida estás? ¿Hay alguna herida reciente (ruptura, duelo) aún viva?",
      pt: "Em que estação de vida está? Há alguma ferida recente (rutura, luto) ainda viva?",
    },
  },
  {
    id: "prep_why",
    dimension: "intentionClarity",
    text: {
      fr: "Pourquoi le mariage, et pourquoi maintenant ?",
      en: "Why marriage, and why now?",
      es: "¿Por qué el matrimonio, y por qué ahora?",
      pt: "Porquê o casamento, e porquê agora?",
    },
  },
  {
    id: "prep_support",
    dimension: "supportNetwork",
    text: {
      fr: "Qui t'entoure et peut te conseiller avec vérité (famille, église, ami·e·s) ?",
      en: "Who surrounds you and can counsel you truthfully (family, church, friends)?",
      es: "¿Quién te rodea y puede aconsejarte con verdad (familia, iglesia, amistades)?",
      pt: "Quem o/a rodeia e pode aconselhar com verdade (família, igreja, amigos)?",
    },
  },
  {
    id: "prep_room",
    dimension: "lifeAvailability",
    text: {
      fr: "Concrètement, quelle place une relation sérieuse aurait-elle dans ta vie actuelle (temps, travail, enfants, projets) ?",
      en: "Concretely, what room would a serious relationship have in your current life (time, work, children, plans)?",
      es: "Concretamente, ¿qué lugar tendría una relación seria en tu vida actual (tiempo, trabajo, hijos, proyectos)?",
      pt: "Concretamente, que lugar teria uma relação séria na sua vida atual (tempo, trabalho, filhos, projetos)?",
    },
  },
];

export const portraitSchema = z.object({
  dimensions: z.record(
    z.enum(DIMENSIONS),
    z.object({
      status: z.enum(["solid", "growing", "accompany"]),
      note: z.string().max(280),
    }),
  ),
  overall: z.enum(["matching_ready", "growth_path", "human_support"]),
  word: z.string().max(500),
});
export type Portrait = z.infer<typeof portraitSchema>;

const DISTRESS_RE =
  /\b(suicid|me faire du mal|détresse|detresse|dépress|depress|je n'en peux plus|no puedo más|não aguento|hurt myself|violence|abus)\b/i;
const RAW_WOUND_RE =
  /\b(deuil|veuf|veuve|décès|deces|rupture récente|divorce en cours|il y a (quelques|deux|trois) mois|recently (widowed|divorced|lost)|duelo|luto recente?)\b/i;

/** Fallback déterministe : doux, jamais excluant, lisible. */
export function fallbackPortrait(
  answers: Array<{ id: string; dimension: Dimension; answer: string }>,
): Portrait {
  const dims = {} as Portrait["dimensions"];
  let accompanyCount = 0;
  let distress = false;
  for (const d of DIMENSIONS) {
    const a = answers.find((x) => x.dimension === d)?.answer ?? "";
    let status: "solid" | "growing" | "accompany" = "growing";
    if (DISTRESS_RE.test(a)) {
      status = "accompany";
      distress = true;
    } else if (d === "emotionalStability" && RAW_WOUND_RE.test(a)) {
      status = "accompany";
    } else if (a.trim().length >= 120) {
      status = "solid";
    }
    if (status === "accompany") accompanyCount++;
    dims[d] = { status, note: "" };
  }
  const overall = distress
    ? "human_support"
    : accompanyCount >= 1
      ? "growth_path"
      : "matching_ready";
  return { dimensions: dims, overall, word: "" };
}

const SYSTEM = `Tu es le Compagnon de Préparation de Chemin d'Alliance, plateforme chrétienne de discernement vers le mariage.
À partir d'un entretien d'accueil, tu dresses un Portrait de Préparation BIENVEILLANT.
Règles absolues :
- JAMAIS de score chiffré, jamais de jugement, jamais d'humiliation.
- Tu ne décides pas pour la personne et tu n'affirmes jamais une volonté divine.
- "accompany" n'est jamais un rejet : c'est une invitation à être accompagné·e.
- Si tu perçois détresse, deuil très récent ou contexte d'abus : overall = "human_support".
- "note" : une phrase chaleureuse et concrète par dimension. "word" : 3-4 phrases d'encouragement personnel.
- Réponds dans la langue de l'entretien.`;

export async function buildPortrait(
  answers: Array<{ id: string; dimension: Dimension; answer: string }>,
  locale: Locale,
): Promise<{ portrait: Portrait; viaLlm: boolean }> {
  const baseline = fallbackPortrait(answers);
  // La détresse détectée localement prime toujours sur l'avis du LLM.
  if (baseline.overall === "human_support") {
    return { portrait: baseline, viaLlm: false };
  }
  const user = answers
    .map((a) => `[${a.dimension}] Q ${a.id}: ${a.answer}`)
    .join("\n");
  const llm = await completeJson(
    `${SYSTEM}\nLangue: ${locale}. Schéma: {"dimensions":{"spiritualRooting":{"status":"solid|growing|accompany","note":"…"},…},"overall":"matching_ready|growth_path|human_support","word":"…"}`,
    user,
    portraitSchema,
    900,
    locale,
  );
  return llm ? { portrait: llm, viaLlm: true } : { portrait: baseline, viaLlm: false };
}
