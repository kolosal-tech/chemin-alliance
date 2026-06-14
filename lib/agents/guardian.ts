import { z } from "zod";
import type { Locale } from "@/lib/core-engine";
import { completeText } from "./llm";

/**
 * Agent 8 — Gardien du Couple. Veille douce sur la vie d'alliance APRÈS
 * le mariage : check-ins réguliers, détection des glissements connus
 * (mois 6, arrivée d'un enfant, couple oublié), rituels concrets.
 * Lois : ne juge jamais, ne tranche jamais, oriente vers le coach humain.
 * GUARDRAIL ABSOLU : violence/abus -> orientation professionnelle immédiate,
 * jamais « restez et priez ».
 */
export type Season = "MARRIED" | "PARENTS";

export const CHECKIN_QUESTIONS: Record<
  Season,
  Array<{ id: string; signal: string; text: Record<Locale, string> }>
> = {
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
    es: "Los primeros años revelan el carácter — es normal, no una señal de error. Nombrad UNA descubierta cada uno esta noche, con suavidad, sin juicio. Si algo bloquea, un coach puede ayudar.",
    pt: "Os primeiros anos revelam o caráter — é normal, não um sinal de erro. Nomeiem UMA descoberta cada um esta noite, com doçura, sem julgamento. Se algo bloquear, um coach pode ajudar.",
  },
  unspoken: {
    fr: "Un sujet évité grandit dans l'ombre. Choisissez un moment calme, et commencez par « J'aimerais qu'on parle de… j'en ai besoin ». Si c'est trop lourd à deux, un accompagnateur peut tenir l'espace.",
    en: "An avoided topic grows in the shadows. Pick a calm moment and start with: \"I would like us to talk about… I need it.\" If it is too heavy for two, a companion can hold the space.",
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
};

/** Violence/abus : orientation professionnelle immédiate — prime sur tout. */
const DANGER_RE =
  /\b(violen|frappe|frappé|coup[s]?\b|abus|peur de (lui|elle)|menace|me fait mal|hits? me|afraid of (him|her)|me pega|tenho medo|me golpea)\b/i;

export const DANGER_RESPONSE: Record<Locale, string> = {
  fr: "Ce que tu décris dépasse ce qu'un agent ou une application peut porter, et ta sécurité passe avant tout. Parle dès maintenant à une personne de confiance et à un professionnel. Un accompagnateur humain de la plateforme peut aussi t'écouter — tu n'es pas seul·e, et rien de tout cela n'est ta faute.",
  en: "What you describe goes beyond what an agent or an app can carry, and your safety comes first. Speak now to someone you trust and to a professional; in case of immediate danger, call your local emergency number. A human companion on the platform can also listen — you are not alone, and none of this is your fault.",
  es: "Lo que describes supera lo que un agente o una aplicación puede sostener, y tu seguridad es lo primero. Habla ahora con una persona de confianza y con un profesional; en peligro inmediato, llama al número de emergencias. Un acompañante humano de la plataforma también puede escucharte — no estás solo/a, y nada de esto es culpa tuya.",
  pt: "O que descreves ultrapassa o que um agente ou uma aplicação pode carregar, e a tua segurança vem primeiro. Fala já com uma pessoa de confiança e com um profissional; em perigo imediato, liga para o número de emergência. Um acompanhante humano da plataforma também pode ouvir-te — não estás sozinho/a, e nada disto é culpa tua.",
};

export const checkinSchema = z.object({
  answers: z.array(
    z.object({ id: z.string(), value: z.enum(["yes", "no", "unsure"]), note: z.string().max(600).default("") }),
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
      q.signal === "unspoken" ? a.value === "yes" : NEGATIVE.includes(a.value as "no" | "unsure");
    if (triggered && RITUALS[q.signal]) {
      rituals.push(RITUALS[q.signal][locale] ?? RITUALS[q.signal].fr);
    }
  }
  return { danger: false, rituals };
}

const SYSTEM = `Tu es le Gardien du Couple de Chemin d'Alliance : tu veilles avec douceur sur des jeunes mariés chrétiens.
Règles absolues : tu ne juges jamais ; tu ne prends jamais parti pour l'un contre l'autre ;
tu n'affirmes jamais une volonté divine ; tu ne minimises jamais une souffrance ;
sur tout sujet grave tu orientes vers un accompagnateur humain.
À partir d'un check-in hebdomadaire, écris 3-4 phrases chaleureuses et UNE suggestion concrète pour la semaine.
Tu réponds uniquement avec ce mot, dans la langue demandée.`;

export async function guardianWord(
  season: Season,
  answers: Array<{ id: string; value: string; note: string }>,
  locale: Locale,
): Promise<string | null> {
  return completeText(
    `${SYSTEM}\nLangue: ${locale}. Saison: ${season === "PARENTS" ? "jeunes parents" : "premières années de mariage"}.`,
    answers.map((a) => `${a.id}: ${a.value}${a.note ? ` — ${a.note}` : ""}`).join("\n"),
    400,
  );
}

/** Parcours de saison — contenu déterministe, 4 langues. */
export const SEASON_PROGRAMS: Record<
  Season,
  Array<{ id: string; title: Record<Locale, string>; body: Record<Locale, string> }>
> = {
  MARRIED: [
    {
      id: "prg_six_months",
      title: { fr: "Les 6 premiers mois", en: "The first 6 months", es: "Los primeros 6 meses", pt: "Os primeiros 6 meses" },
      body: {
        fr: "Le caractère se dévoile, les habitudes se frottent. Apprendre à se disputer proprement, poser les rythmes du foyer, protéger l'émerveillement.",
        en: "Character is revealed, habits rub against each other. Learn to argue cleanly, set the home's rhythms, protect the wonder.",
        es: "El carácter se revela, los hábitos rozan. Aprender a discutir limpiamente, fijar los ritmos del hogar, proteger el asombro.",
        pt: "O caráter revela-se, os hábitos atritam. Aprender a discutir com limpeza, definir os ritmos do lar, proteger o deslumbramento.",
      },
    },
    {
      id: "prg_finances",
      title: { fr: "Finances du foyer", en: "Household finances", es: "Finanzas del hogar", pt: "Finanças do lar" },
      body: {
        fr: "Budget commun, transparence totale, générosité décidée à deux. L'argent est le premier champ de bataille évitable.",
        en: "Shared budget, full transparency, generosity decided together. Money is the first avoidable battlefield.",
        es: "Presupuesto común, transparencia total, generosidad decidida a dos. El dinero es el primer campo de batalla evitable.",
        pt: "Orçamento comum, transparência total, generosidade decidida a dois. O dinheiro é o primeiro campo de batalha evitável.",
      },
    },
    {
      id: "prg_inlaws",
      title: { fr: "Belle-famille dans la grâce", en: "In-laws in grace", es: "Familia política en la gracia", pt: "Sogros na graça" },
      body: {
        fr: "Quitter père et mère sans les rejeter : poser des frontières aimantes, parler d'une seule voix, honorer sans se laisser gouverner.",
        en: "Leaving father and mother without rejecting them: loving boundaries, speaking with one voice, honoring without being ruled.",
        es: "Dejar padre y madre sin rechazarlos: fronteras amorosas, hablar con una sola voz, honrar sin ser gobernados.",
        pt: "Deixar pai e mãe sem os rejeitar: fronteiras amorosas, falar a uma só voz, honrar sem ser governado.",
      },
    },
  ],
  PARENTS: [
    {
      id: "prg_child_arrival",
      title: { fr: "L'arrivée d'un enfant", en: "A child arrives", es: "La llegada de un hijo", pt: "A chegada de um filho" },
      body: {
        fr: "La joie immense et la tempête réelle : nuits brisées, corps fatigués, couple bousculé. Traverser ensemble, sans se perdre de vue.",
        en: "Immense joy and a real storm: broken nights, tired bodies, a shaken couple. Cross it together without losing sight of each other.",
        es: "La alegría inmensa y la tormenta real: noches rotas, cuerpos cansados, pareja sacudida. Atravesarlo juntos sin perderse de vista.",
        pt: "A alegria imensa e a tempestade real: noites quebradas, corpos cansados, casal abalado. Atravessar juntos, sem se perderem de vista.",
      },
    },
    {
      id: "prg_stay_couple",
      title: { fr: "Rester un couple en étant parents", en: "Staying a couple while being parents", es: "Seguir siendo pareja siendo padres", pt: "Continuar casal sendo pais" },
      body: {
        fr: "L'enfant n'est pas le centre : il est le fruit. Rituels à deux non négociables, tendresse entretenue, relais acceptés sans culpabilité.",
        en: "The child is not the center: the child is the fruit. Non-negotiable couple rituals, tended tenderness, help accepted without guilt.",
        es: "El hijo no es el centro: es el fruto. Rituales de pareja no negociables, ternura cuidada, relevos aceptados sin culpa.",
        pt: "O filho não é o centro: é o fruto. Rituais a dois não negociáveis, ternura cuidada, ajudas aceites sem culpa.",
      },
    },
    {
      id: "prg_faith_transmission",
      title: { fr: "Transmettre la foi", en: "Passing on the faith", es: "Transmitir la fe", pt: "Transmitir a fé" },
      body: {
        fr: "L'exemple avant la parole : prier devant l'enfant, se pardonner devant l'enfant, faire de la maison un lieu où Dieu est naturel.",
        en: "Example before words: pray in front of the child, forgive each other in front of the child, make home a place where God is natural.",
        es: "El ejemplo antes que la palabra: orar delante del niño, perdonarse delante del niño, hacer del hogar un lugar donde Dios es natural.",
        pt: "O exemplo antes da palavra: orar diante da criança, perdoarem-se diante da criança, fazer do lar um lugar onde Deus é natural.",
      },
    },
  ],
};

export function generateInviteCode(): string {
  // Code lisible type ALLIANCE-7F3K9Q (sans 0/O/1/I)
  const chars = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `ALLIANCE-${code}`;
}
