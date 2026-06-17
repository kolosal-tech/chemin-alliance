import { randomInt } from "node:crypto";
import { z } from "zod";
import type { Locale } from "@/lib/core-engine";
import { completeText } from "./llm";

/**
 * Agent 8 — Gardien du Couple. Veille douce sur la vie d'alliance APRÈS
 * le mariage : check-ins réguliers, détection des glissements connus
 * (mois 6, arrivée d'un enfant, couple oublié, intimité en sommeil),
 * rituels concrets.
 * Lois : ne juge jamais, ne tranche jamais, oriente vers le coach humain.
 * Intimité conjugale abordée avec liberté biblique et pudeur ; en cas de
 * douleur, contrainte ou non-consentement -> orientation médecin/thérapeute.
 * GUARDRAIL ABSOLU : violence/abus/coercition -> orientation professionnelle
 * immédiate (DANGER_RE), jamais « restez et priez ».
 */
export type Season = "ENGAGED" | "MARRIED" | "PARENTS";

export const CHECKIN_QUESTIONS: Record<
  Season,
  Array<{ id: string; signal: string; text: Record<Locale, string> }>
> = {
  ENGAGED: [
    {
      id: "chk_eng_dialogue",
      signal: "couple_time",
      text: {
        fr: "Avez-vous pris un vrai temps d'échange profond cette semaine — au-delà de l'organisation du mariage ?",
        en: "Did you take real time for deep conversation this week — beyond wedding planning?",
        es: "¿Tuvisteis un tiempo real de diálogo profundo esta semana — más allá de la organización de la boda?",
        pt: "Tiveram um tempo verdadeiro de diálogo profundo esta semana — para além da organização do casamento?",
      },
    },
    {
      id: "chk_eng_unspoken",
      signal: "unspoken",
      text: {
        fr: "Y a-t-il un sujet (famille, finances, passé, attentes) que vous repoussez avant le mariage ?",
        en: "Is there a topic (family, finances, past, expectations) you keep putting off before marriage?",
        es: "¿Hay algún tema (familia, finanzas, pasado, expectativas) que estéis posponiendo antes del matrimonio?",
        pt: "Há algum assunto (família, finanças, passado, expectativas) que estejam a adiar antes do casamento?",
      },
    },
    {
      id: "chk_eng_limits",
      signal: "purity",
      text: {
        fr: "Vivez-vous vos limites physiques avec paix et accord mutuel en ce temps de fiançailles ?",
        en: "Are you living your physical boundaries with peace and mutual agreement during this engagement?",
        es: "¿Vivís vuestros límites físicos con paz y acuerdo mutuo durante este noviazgo?",
        pt: "Vivem os vossos limites físicos com paz e acordo mútuo durante este noivado?",
      },
    },
  ],
  MARRIED: [
    {
      id: "chk_time_together",
      signal: "couple_time",
      text: {
        fr: "Avez-vous eu un vrai temps à deux cette semaine — sans écran, sans tâches ?",
        en: "Did you have real time together this week — no screens, no chores?",
        es: "¿Tuvisteis un tiempo real para los dos esta semana — sin pantallas, sin tareas?",
        pt: "Tiveram um tempo verdadeiro a dois esta semana — sem ecrãs, sem tarefas?",
      },
    },
    {
      id: "chk_discovery",
      signal: "character_reveal",
      text: {
        fr: "Qu'as-tu découvert chez l'autre récemment qui t'a surpris — en bien ou en difficile ?",
        en: "What did you recently discover about your spouse that surprised you — good or hard?",
        es: "¿Qué descubriste recientemente en tu cónyuge que te sorprendió — bueno o difícil?",
        pt: "O que descobriste recentemente no teu cônjuge que te surpreendeu — bom ou difícil?",
      },
    },
    {
      id: "chk_unspoken",
      signal: "unspoken",
      text: {
        fr: "Y a-t-il un sujet que vous évitez en ce moment ?",
        en: "Is there a topic you are avoiding right now?",
        es: "¿Hay algún tema que estéis evitando ahora mismo?",
        pt: "Há algum assunto que estejam a evitar neste momento?",
      },
    },
    {
      id: "chk_intimacy",
      signal: "intimacy",
      text: {
        fr: "L'intimité et la tendresse physique entre vous ont-elles eu leur juste place cette semaine ?",
        en: "Did intimacy and physical tenderness between you have their rightful place this week?",
        es: "¿La intimidad y la ternura física entre vosotros tuvieron su justo lugar esta semana?",
        pt: "A intimidade e a ternura física entre vocês tiveram o seu justo lugar esta semana?",
      },
    },
  ],
  PARENTS: [
    {
      id: "chk_couple_vs_child",
      signal: "child_focus",
      text: {
        fr: "Depuis l'arrivée de l'enfant, quand avez-vous pris un moment pour vous deux — juste vous deux ?",
        en: "Since the child arrived, when did you last take a moment just for the two of you?",
        es: "Desde la llegada del niño, ¿cuándo tomasteis un momento solo para vosotros dos?",
        pt: "Desde a chegada da criança, quando tiveram um momento só para os dois?",
      },
    },
    {
      id: "chk_load",
      signal: "load_balance",
      text: {
        fr: "La charge (nuits, soins, maison) vous semble-t-elle partagée avec justice en ce moment ?",
        en: "Does the load (nights, care, home) feel fairly shared right now?",
        es: "¿La carga (noches, cuidados, casa) os parece repartida con justicia ahora?",
        pt: "A carga (noites, cuidados, casa) parece-vos partilhada com justiça agora?",
      },
    },
    {
      id: "chk_tenderness",
      signal: "tenderness",
      text: {
        fr: "La tendresse entre vous a-t-elle encore sa place cette semaine ?",
        en: "Did tenderness between you still have its place this week?",
        es: "¿La ternura entre vosotros tuvo su lugar esta semana?",
        pt: "A ternura entre vocês ainda teve o seu lugar esta semana?",
      },
    },
    {
      id: "chk_intimacy",
      signal: "intimacy",
      text: {
        fr: "Depuis l'arrivée de l'enfant, l'intimité du couple a-t-elle pu retrouver, doucement, sa place ?",
        en: "Since the child arrived, has the couple's intimacy been able to gently find its place again?",
        es: "Desde la llegada del niño, ¿la intimidad de la pareja ha podido recuperar, con suavidad, su lugar?",
        pt: "Desde a chegada da criança, a intimidade do casal conseguiu, com doçura, reencontrar o seu lugar?",
      },
    },
  ],
};

/** Rituels concrets proposés quand un signal faiblit (fallback déterministe). */
export const RITUALS: Record<string, Record<Locale, string>> = {
  couple_time: {
    fr: "Rituel proposé : bloquez dès maintenant 2 heures cette semaine, rien que vous deux — une marche, un café, sans téléphone. Mettez-le dans l'agenda comme un rendez-vous qu'on n'annule pas.",
    en: "Suggested ritual: block 2 hours this week, just the two of you — a walk, a coffee, no phones. Put it in the calendar like an appointment you don't cancel.",
    es: "Ritual propuesto: bloquead ya 2 horas esta semana, solo vosotros dos — un paseo, un café, sin teléfonos. Ponedlo en la agenda como una cita que no se cancela.",
    pt: "Ritual proposto: bloqueiem já 2 horas esta semana, só os dois — uma caminhada, um café, sem telemóveis. Ponham na agenda como um encontro que não se cancela.",
  },
  character_reveal: {
    fr: "Les premières années dévoilent le caractère — c'est normal, pas un signal d'erreur. Nommez UNE découverte chacun ce soir, avec douceur, sans procès. Si un point bloque, un coach peut aider à le traverser.",
    en: "The first years reveal character — that is normal, not a sign of error. Each of you name ONE discovery tonight, gently, no trial. If something blocks, a coach can help you through.",
    es: "Los primeros años revelan el carácter — es normal, no una señal de error. Compartid UN descubrimiento cada uno esta noche, con suavidad, sin juicio. Si algo bloquea, un coach puede ayudar.",
    pt: "Os primeiros anos revelam o caráter — é normal, não um sinal de erro. Nomeiem UMA descoberta cada um esta noite, com doçura, sem julgamento. Se algo bloquear, um coach pode ajudar.",
  },
  unspoken: {
    fr: "Un sujet évité grandit dans l'ombre. Choisissez un moment calme, et commencez par « J'aimerais qu'on parle de… j'en ai besoin ». Si c'est trop lourd à deux, un accompagnateur peut tenir l'espace.",
    en: 'An avoided topic grows in the shadows. Pick a calm moment and start with: "I would like us to talk about… I need it." If it is too heavy for two, a companion can hold the space.',
    es: "Un tema evitado crece en la sombra. Elegid un momento tranquilo y empezad con «Me gustaría que habláramos de… lo necesito». Si pesa demasiado, un acompañante puede sostener el espacio.",
    pt: "Um assunto evitado cresce na sombra. Escolham um momento calmo e comecem com «Gostava que falássemos de… preciso disso». Se pesar demasiado, um acompanhante pode segurar o espaço.",
  },
  child_focus: {
    fr: "L'enfant a besoin d'un couple vivant plus que de deux parents épuisés. Cette semaine : 30 minutes à deux pendant que le bébé dort, et une garde confiée (famille, église) d'ici un mois pour une vraie sortie.",
    en: "Your child needs a living couple more than two exhausted parents. This week: 30 minutes together while the baby sleeps, and childcare arranged (family, church) within a month for a real outing.",
    es: "El niño necesita una pareja viva más que dos padres agotados. Esta semana: 30 minutos juntos mientras el bebé duerme, y una guarda confiada (familia, iglesia) en un mes para una salida real.",
    pt: "A criança precisa de um casal vivo mais do que de dois pais exaustos. Esta semana: 30 minutos a dois enquanto o bebé dorme, e uma guarda combinada (família, igreja) dentro de um mês para uma saída real.",
  },
  load_balance: {
    fr: "La rancune naît des charges invisibles. Posez la liste complète (nuits, repas, rendez-vous, charge mentale) sur papier, et redistribuez UNE chose dès cette semaine.",
    en: "Resentment grows from invisible loads. Put the full list on paper (nights, meals, appointments, mental load) and redistribute ONE thing this week.",
    es: "El resentimiento nace de cargas invisibles. Poned la lista completa en papel (noches, comidas, citas, carga mental) y redistribuid UNA cosa esta semana.",
    pt: "O ressentimento nasce de cargas invisíveis. Ponham a lista completa no papel (noites, refeições, consultas, carga mental) e redistribuam UMA coisa esta semana.",
  },
  tenderness: {
    fr: "La tendresse s'entretient par des gestes minuscules : un mot le matin, une main posée, un merci précis. Un par jour, chacun, pendant sept jours — puis regardez ce qui a changé.",
    en: "Tenderness is kept alive by tiny gestures: a morning word, a hand placed, a precise thank-you. One each, every day, for seven days — then see what changed.",
    es: "La ternura se mantiene con gestos minúsculos: una palabra por la mañana, una mano puesta, un gracias preciso. Uno cada uno, cada día, durante siete días — luego mirad qué cambió.",
    pt: "A ternura mantém-se com gestos minúsculos: uma palavra de manhã, uma mão pousada, um obrigado preciso. Um cada um, todos os dias, durante sete dias — depois vejam o que mudou.",
  },
  intimacy: {
    fr: "L'intimité se cultive comme un jardin : tendresse au quotidien, parole vraie et sans pression, et du temps protégé rien qu'à vous. Cette semaine, osez en parler avec douceur — ce que chacun désire, ce qui pèse. Si une douleur ou un blocage persiste, un accompagnateur ou un médecin peut aider, sans honte.",
    en: "Intimacy is grown like a garden: daily tenderness, honest words without pressure, and protected time just for the two of you. This week, dare to speak about it gently — what each of you longs for, what weighs. If pain or a block persists, a counselor or doctor can help, without shame.",
    es: "La intimidad se cultiva como un jardín: ternura diaria, palabra verdadera y sin presión, y tiempo protegido solo para vosotros. Esta semana, atreveos a hablar con suavidad — lo que cada uno desea, lo que pesa. Si un dolor o un bloqueo persiste, un acompañante o un médico puede ayudar, sin vergüenza.",
    pt: "A intimidade cultiva-se como um jardim: ternura diária, palavra verdadeira e sem pressão, e tempo protegido só para os dois. Esta semana, ousem falar com doçura — o que cada um deseja, o que pesa. Se uma dor ou um bloqueio persistir, um acompanhante ou um médico pode ajudar, sem vergonha.",
  },
  purity: {
    fr: "Les limites se tiennent à deux : décidées d'avance, au calme, jamais dans l'instant. Parlez de ce qui est juste pour chacun, sans pression ni honte, et honorez vos corps. Si c'est une lutte, ne restez pas seuls — un couple mentor ou un accompagnateur aide à traverser ce temps avec paix.",
    en: "Boundaries are held together: decided in advance, calmly, never in the moment. Talk about what is right for each of you, without pressure or shame, and honor your bodies. If it is a struggle, do not stay alone — a mentor couple or counselor helps you cross this season in peace.",
    es: "Los límites se sostienen a dos: decididos de antemano, en calma, nunca en el momento. Hablad de lo que es justo para cada uno, sin presión ni vergüenza, y honrad vuestros cuerpos. Si es una lucha, no os quedéis solos — un matrimonio mentor o un acompañante ayuda a atravesar este tiempo con paz.",
    pt: "Os limites seguram-se a dois: decididos com antecedência, com calma, nunca no momento. Falem do que é justo para cada um, sem pressão nem vergonha, e honrem os vossos corpos. Se for uma luta, não fiquem sozinhos — um casal mentor ou um acompanhante ajuda a atravessar este tempo com paz.",
  },
};

/** Violence/abus : orientation professionnelle immédiate — prime sur tout. */
// Ne garder que des marqueurs de coercition INTERPERSONNELLE (avec objet/pronom
// de personne). On retire les adjectifs nus « forcé/obligé/contrainte » et les
// formes ambiguës (« me oblige », « forces me ») qui matchaient des phrases
// anodines (« on est obligé de revoir le budget », « this forces me to rethink »).
const DANGER_RE =
  /(violen|frappe|frappé|\bcoup[s]?\b|abus|peur de (lui|elle)|menace|me fait mal|me force|m'oblige|me oblige à|sans (mon |son )?consentement|sans mon accord|hits? me|afraid of (him|her)|without (my |his |her )?consent|coerc|me pega|tenho medo|me golpea|me obliga a|me fuerza|sin (mi |su )?consentimiento|obriga-me|força-me|sem (o |meu )?consentimento)/i;

export const DANGER_RESPONSE: Record<Locale, string> = {
  fr: "Ce que tu décris dépasse ce qu'un agent ou une application peut porter, et ta sécurité passe avant tout. Parle dès maintenant à une personne de confiance et à un professionnel. Un accompagnateur humain de la plateforme peut aussi t'écouter — tu n'es pas seul·e, et rien de tout cela n'est ta faute.",
  en: "What you describe goes beyond what an agent or an app can carry, and your safety comes first. Speak now to someone you trust and to a professional; in case of immediate danger, call your local emergency number. A human companion on the platform can also listen — you are not alone, and none of this is your fault.",
  es: "Lo que describes supera lo que un agente o una aplicación puede sostener, y tu seguridad es lo primero. Habla ahora con una persona de confianza y con un profesional; en peligro inmediato, llama al número de emergencias. Un acompañante humano de la plataforma también puede escucharte — no estás solo/a, y nada de esto es culpa tuya.",
  pt: "O que descreves ultrapassa o que um agente ou uma aplicação pode carregar, e a tua segurança vem primeiro. Fala já com uma pessoa de confiança e com um profissional; em perigo imediato, liga para o número de emergência. Um acompanhante humano da plataforma também pode ouvir-te — não estás sozinho/a, e nada disto é culpa tua.",
};

export const checkinSchema = z.object({
  answers: z.array(
    z.object({
      id: z.string(),
      value: z.enum(["yes", "no", "unsure"]),
      note: z.string().max(600).default(""),
    }),
  ),
});

export type GuardianGuidance = {
  danger: boolean;
  rituals: string[]; // rituels déclenchés (déterministe)
  word: string | null; // mot personnalisé LLM
};

const NEGATIVE: Array<"no" | "unsure"> = ["no", "unsure"];

export function evaluateCheckin(
  season: Season,
  answers: Array<{ id: string; value: "yes" | "no" | "unsure"; note: string }>,
  locale: Locale,
): Omit<GuardianGuidance, "word"> {
  const allNotes = answers.map((a) => a.note).join(" ");
  if (DANGER_RE.test(allNotes)) {
    return { danger: true, rituals: [] };
  }
  const questions = CHECKIN_QUESTIONS[season];
  const rituals: string[] = [];
  for (const a of answers) {
    const q = questions.find((x) => x.id === a.id);
    if (!q) continue;
    // « non / pas sûr » sur un signal -> rituel concret correspondant.
    // chk_unspoken inversé : « oui il y a un sujet évité » déclenche.
    const triggered =
      q.signal === "unspoken"
        ? a.value === "yes"
        : NEGATIVE.includes(a.value as "no" | "unsure");
    if (triggered && RITUALS[q.signal]) {
      rituals.push(RITUALS[q.signal][locale] ?? RITUALS[q.signal].fr);
    }
  }
  return { danger: false, rituals };
}

const SYSTEM = `Tu es le Gardien du Couple de Chemin d'Alliance : tu veilles avec douceur sur des couples chrétiens — fiancés en préparation, jeunes mariés ou jeunes parents.
Règles absolues : tu ne juges jamais ; tu ne prends jamais parti pour l'un contre l'autre ;
tu n'affirmes jamais une volonté divine ; tu ne minimises jamais une souffrance ;
sur tout sujet grave tu orientes vers un accompagnateur humain.
Tu peux aborder l'intimité conjugale et la sexualité dans le mariage avec une liberté biblique et une pudeur respectueuse, sans tabou mais sans aucun détail explicite ; devant une douleur, une contrainte, une absence de consentement ou une blessure dans ce domaine, tu orientes vers un médecin ou un thérapeute.
À partir d'un check-in hebdomadaire, écris 3-4 phrases chaleureuses et UNE suggestion concrète pour la semaine.
Tu réponds uniquement avec ce mot, dans la langue demandée.`;

export async function guardianWord(
  season: Season,
  answers: Array<{ id: string; value: string; note: string }>,
  locale: Locale,
): Promise<string | null> {
  return completeText(
    `${SYSTEM}\nLangue: ${locale}. Saison: ${
      season === "PARENTS"
        ? "jeunes parents"
        : season === "ENGAGED"
          ? "fiancés en préparation au mariage"
          : "premières années de mariage"
    }.`,
    answers
      .map((a) => `${a.id}: ${a.value}${a.note ? ` — ${a.note}` : ""}`)
      .join("\n"),
    400,
  );
}

/** Parcours de saison — contenu déterministe, 4 langues. */
export const SEASON_PROGRAMS: Record<
  Season,
  Array<{
    id: string;
    title: Record<Locale, string>;
    body: Record<Locale, string>;
  }>
> = {
  ENGAGED: [
    {
      id: "prg_eng_foundations",
      title: {
        fr: "Bâtir sur le roc",
        en: "Building on the rock",
        es: "Construir sobre la roca",
        pt: "Construir sobre a rocha",
      },
      body: {
        fr: "Avant la salle et la robe : pourquoi nous, pourquoi maintenant, vers quel foyer ? Une maison bâtie sur le roc tient la tempête (Mt 7.24). Posez ensemble votre vision — foi, enfants, mission — pendant qu'il est temps d'en parler librement.",
        en: "Before the venue and the dress: why us, why now, toward what home? A house built on the rock withstands the storm (Mt 7:24). Set your shared vision together — faith, children, mission — while there is still freedom to talk it through.",
        es: "Antes del salón y el vestido: por qué nosotros, por qué ahora, hacia qué hogar. Una casa construida sobre la roca resiste la tormenta (Mt 7:24). Pongan juntos su visión — fe, hijos, misión — mientras hay libertad para hablarlo.",
        pt: "Antes do salão e do vestido: porquê nós, porquê agora, rumo a que lar? Uma casa construída sobre a rocha resiste à tempestade (Mt 7:24). Definam juntos a vossa visão — fé, filhos, missão — enquanto há liberdade para falar.",
      },
    },
    {
      id: "prg_eng_truth",
      title: {
        fr: "Tout se dire avant le oui",
        en: "Everything said before the yes",
        es: "Decirlo todo antes del sí",
        pt: "Dizer tudo antes do sim",
      },
      body: {
        fr: "Le mariage n'aime pas les surprises. Finances, dettes, famille, blessures du passé, attentes sur les rôles et l'intimité : ce qui se dit maintenant ne se découvre pas trop tard. La vérité, dans la douceur, est un cadeau.",
        en: "Marriage dislikes surprises. Finances, debts, family, past wounds, expectations about roles and intimacy: what is said now is not discovered too late. Truth, spoken gently, is a gift.",
        es: "El matrimonio no ama las sorpresas. Finanzas, deudas, familia, heridas del pasado, expectativas sobre los roles y la intimidad: lo que se dice ahora no se descubre demasiado tarde. La verdad, con dulzura, es un regalo.",
        pt: "O casamento não gosta de surpresas. Finanças, dívidas, família, feridas do passado, expectativas sobre os papéis e a intimidade: o que se diz agora não se descobre tarde demais. A verdade, com doçura, é um presente.",
      },
    },
    {
      id: "prg_eng_purity",
      title: {
        fr: "Des fiançailles dans la paix",
        en: "Engagement in peace",
        es: "Un noviazgo en paz",
        pt: "Um noivado em paz",
      },
      body: {
        fr: "Le temps des fiançailles a ses limites, et elles protègent l'amour plutôt que de l'éteindre. Décidez-les ensemble, à froid, sans pression ni honte ; honorez vos corps (1 Th 4.3-5). Si c'est une lutte, ne restez pas seuls : un couple mentor ou un accompagnateur aide à tenir ce cap.",
        en: "Engagement has its boundaries, and they protect love rather than smother it. Decide them together, calmly, without pressure or shame; honor your bodies (1 Th 4:3-5). If it is a struggle, do not stay alone: a mentor couple or counselor helps you hold the course.",
        es: "El noviazgo tiene sus límites, y protegen el amor en vez de apagarlo. Decídanlos juntos, en calma, sin presión ni vergüenza; honren sus cuerpos (1 Ts 4:3-5). Si es una lucha, no se queden solos: un matrimonio mentor o un acompañante ayuda a sostener el rumbo.",
        pt: "O noivado tem os seus limites, e protegem o amor em vez de o apagar. Decidam-nos juntos, com calma, sem pressão nem vergonha; honrem os vossos corpos (1 Ts 4:3-5). Se for uma luta, não fiquem sozinhos: um casal mentor ou um acompanhante ajuda a manter o rumo.",
      },
    },
    {
      id: "prg_eng_covenant",
      title: {
        fr: "Préparer l'alliance, pas que la fête",
        en: "Prepare the covenant, not just the party",
        es: "Preparar la alianza, no solo la fiesta",
        pt: "Preparar a aliança, não só a festa",
      },
      body: {
        fr: "Un jour passe ; une alliance dure. Travaillez les vœux, le sens de l'engagement devant Dieu, le pardon au quotidien — plus que le plan de table. La fête célèbre ce que vous construisez ; ne confondez pas l'emballage et le don.",
        en: "A day passes; a covenant lasts. Work on the vows, the meaning of the commitment before God, daily forgiveness — more than the seating chart. The party celebrates what you build; do not mistake the wrapping for the gift.",
        es: "Un día pasa; una alianza permanece. Trabajen los votos, el sentido del compromiso ante Dios, el perdón cotidiano — más que el plano de mesas. La fiesta celebra lo que construyen; no confundan el envoltorio con el don.",
        pt: "Um dia passa; uma aliança permanece. Trabalhem os votos, o sentido do compromisso diante de Deus, o perdão quotidiano — mais do que o plano de mesas. A festa celebra o que constroem; não confundam a embalagem com o dom.",
      },
    },
  ],
  MARRIED: [
    {
      id: "prg_six_months",
      title: {
        fr: "Les 6 premiers mois",
        en: "The first 6 months",
        es: "Los primeros 6 meses",
        pt: "Os primeiros 6 meses",
      },
      body: {
        fr: "Le caractère se dévoile, les habitudes se frottent. Apprendre à se disputer proprement, poser les rythmes du foyer, protéger l'émerveillement.",
        en: "Character is revealed, habits rub against each other. Learn to argue cleanly, set the home's rhythms, protect the wonder.",
        es: "El carácter se revela, los hábitos rozan. Aprender a discutir limpiamente, fijar los ritmos del hogar, proteger el asombro.",
        pt: "O caráter revela-se, os hábitos atritam. Aprender a discutir com limpeza, definir os ritmos do lar, proteger o deslumbramento.",
      },
    },
    {
      id: "prg_finances",
      title: {
        fr: "Finances du foyer",
        en: "Household finances",
        es: "Finanzas del hogar",
        pt: "Finanças do lar",
      },
      body: {
        fr: "Budget commun, transparence totale, générosité décidée à deux. L'argent est le premier champ de bataille évitable.",
        en: "Shared budget, full transparency, generosity decided together. Money is the first avoidable battlefield.",
        es: "Presupuesto común, transparencia total, generosidad decidida a dos. El dinero es el primer campo de batalla evitable.",
        pt: "Orçamento comum, transparência total, generosidade decidida a dois. O dinheiro é o primeiro campo de batalha evitável.",
      },
    },
    {
      id: "prg_inlaws",
      title: {
        fr: "Belle-famille dans la grâce",
        en: "In-laws in grace",
        es: "Familia política en la gracia",
        pt: "Sogros na graça",
      },
      body: {
        fr: "Quitter père et mère sans les rejeter : poser des frontières aimantes, parler d'une seule voix, honorer sans se laisser gouverner.",
        en: "Leaving father and mother without rejecting them: loving boundaries, speaking with one voice, honoring without being ruled.",
        es: "Dejar padre y madre sin rechazarlos: fronteras amorosas, hablar con una sola voz, honrar sin ser gobernados.",
        pt: "Deixar pai e mãe sem os rejeitar: fronteiras amorosas, falar a uma só voz, honrar sem ser governado.",
      },
    },
    {
      id: "prg_intimacy",
      title: {
        fr: "Intimité conjugale",
        en: "Conjugal intimacy",
        es: "Intimidad conyugal",
        pt: "Intimidade conjugal",
      },
      body: {
        fr: "Le Cantique des Cantiques célèbre le désir sans gêne, et l'apôtre invite les époux à ne pas se priver l'un de l'autre (1 Co 7.3-5) — un appel à la générosité mutuelle, jamais à la contrainte ni à la pression sur l'autre. L'intimité est un don à cultiver : tendresse, écoute des rythmes de chacun, parole sans tabou ni pression. Les blessures et les silences se soignent — à deux, et avec aide si besoin.",
        en: "The Song of Songs celebrates desire without embarrassment, and the apostle invites spouses not to deprive one another (1 Cor 7:3-5) — a call to mutual generosity, never to coercion or pressure on the other. Intimacy is a gift to cultivate: tenderness, attention to each other's rhythms, words without taboo or pressure. Wounds and silences can heal — together, and with help if needed.",
        es: "El Cantar de los Cantares celebra el deseo sin vergüenza, y el apóstol invita a los esposos a no privarse el uno del otro (1 Co 7:3-5) — una llamada a la generosidad mutua, nunca a la coacción ni a la presión sobre el otro. La intimidad es un don que cultivar: ternura, atención a los ritmos de cada uno, palabra sin tabú ni presión. Las heridas y los silencios se sanan — a dos, y con ayuda si hace falta.",
        pt: "O Cântico dos Cânticos celebra o desejo sem constrangimento, e o apóstolo convida os esposos a não se privarem um do outro (1 Co 7:3-5) — um apelo à generosidade mútua, nunca à coação nem à pressão sobre o outro. A intimidade é um dom a cultivar: ternura, atenção aos ritmos de cada um, palavra sem tabu nem pressão. As feridas e os silêncios saram — a dois, e com ajuda se preciso.",
      },
    },
  ],
  PARENTS: [
    {
      id: "prg_child_arrival",
      title: {
        fr: "L'arrivée d'un enfant",
        en: "A child arrives",
        es: "La llegada de un hijo",
        pt: "A chegada de um filho",
      },
      body: {
        fr: "La joie immense et la tempête réelle : nuits brisées, corps fatigués, couple bousculé. Traverser ensemble, sans se perdre de vue.",
        en: "Immense joy and a real storm: broken nights, tired bodies, a shaken couple. Cross it together without losing sight of each other.",
        es: "La alegría inmensa y la tormenta real: noches rotas, cuerpos cansados, pareja sacudida. Atravesarlo juntos sin perderse de vista.",
        pt: "A alegria imensa e a tempestade real: noites quebradas, corpos cansados, casal abalado. Atravessar juntos, sem se perderem de vista.",
      },
    },
    {
      id: "prg_stay_couple",
      title: {
        fr: "Rester un couple en étant parents",
        en: "Staying a couple while being parents",
        es: "Seguir siendo pareja siendo padres",
        pt: "Continuar casal sendo pais",
      },
      body: {
        fr: "L'enfant n'est pas le centre : il est le fruit. Rituels à deux non négociables, tendresse entretenue, relais acceptés sans culpabilité.",
        en: "The child is not the center: the child is the fruit. Non-negotiable couple rituals, tended tenderness, help accepted without guilt.",
        es: "El hijo no es el centro: es el fruto. Rituales de pareja no negociables, ternura cuidada, relevos aceptados sin culpa.",
        pt: "O filho não é o centro: é o fruto. Rituais a dois não negociáveis, ternura cuidada, ajudas aceites sem culpa.",
      },
    },
    {
      id: "prg_faith_transmission",
      title: {
        fr: "Transmettre la foi",
        en: "Passing on the faith",
        es: "Transmitir la fe",
        pt: "Transmitir a fé",
      },
      body: {
        fr: "L'exemple avant la parole : prier devant l'enfant, se pardonner devant l'enfant, faire de la maison un lieu où Dieu est naturel.",
        en: "Example before words: pray in front of the child, forgive each other in front of the child, make home a place where God is natural.",
        es: "El ejemplo antes que la palabra: orar delante del niño, perdonarse delante del niño, hacer del hogar un lugar donde Dios es natural.",
        pt: "O exemplo antes da palavra: orar diante da criança, perdoarem-se diante da criança, fazer do lar um lugar onde Deus é natural.",
      },
    },
    {
      id: "prg_intimacy_after_child",
      title: {
        fr: "Retrouver l'intimité après l'enfant",
        en: "Rediscovering intimacy after a child",
        es: "Reencontrar la intimidad tras el hijo",
        pt: "Reencontrar a intimidade após o filho",
      },
      body: {
        fr: "Après une naissance, la fatigue, le corps qui change et le manque de temps mettent l'intimité en sommeil — c'est fréquent, et ce n'est pas un échec. On la retrouve par petits pas : la tendresse d'abord, la patience pour le corps de la mère, la parole sans reproche. Sans précipitation, mais sans l'oublier.",
        en: "After a birth, fatigue, the changing body, and lack of time put intimacy to sleep — this is common, and not a failure. It returns step by step: tenderness first, patience for the mother's body, words without reproach. Unhurried, but not forgotten.",
        es: "Tras un nacimiento, el cansancio, el cuerpo que cambia y la falta de tiempo adormecen la intimidad — es frecuente, y no es un fracaso. Se recupera paso a paso: primero la ternura, paciencia con el cuerpo de la madre, palabra sin reproche. Sin prisa, pero sin olvidarla.",
        pt: "Após um nascimento, o cansaço, o corpo que muda e a falta de tempo adormecem a intimidade — é frequente, e não é um fracasso. Recupera-se passo a passo: primeiro a ternura, paciência com o corpo da mãe, palavra sem censura. Sem pressa, mas sem a esquecer.",
      },
    },
  ],
};

export function generateInviteCode(): string {
  // Code lisible type ALLIANCE-7F3K9Q (sans 0/O/1/I).
  // RNG cryptographique (randomInt) plutôt que Math.random : le code est un
  // secret d'accès à un espace couple — il doit être non devinable et non biaisé.
  const chars = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[randomInt(chars.length)];
  }
  return `ALLIANCE-${code}`;
}
