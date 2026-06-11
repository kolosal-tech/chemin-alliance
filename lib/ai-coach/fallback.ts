import type { AllianceStage } from "@prisma/client";
import type { Locale } from "@/lib/core-engine";

/**
 * MODE FALLBACK déterministe : sans clé API, le coach répond avec des
 * orientations scriptées par étape. La prod tourne sans dépendance payante.
 */
type StageKey = Exclude<AllianceStage, "CLOSED"> | "GENERAL";

const RESPONSES: Record<StageKey, Record<Locale, string[]>> = {
  GENERAL: {
    fr: [
      "Je suis là pour t'aider à réfléchir, pas pour décider à ta place. Dis-moi où tu en es dans ton parcours, et je te proposerai des questions pour avancer.",
      "Prends un instant : qu'est-ce qui, dans ta journée, a nourri ta réflexion sur la relation que tu construis ?",
    ],
    en: [
      "I'm here to help you reflect, not to decide for you. Tell me where you are on your journey, and I'll suggest questions to move forward.",
      "Take a moment: what in your day nourished your reflection on the relationship you are building?",
    ],
    es: [
      "Estoy aquí para ayudarte a reflexionar, no para decidir por ti. Dime en qué punto del camino estás y te propondré preguntas para avanzar.",
      "Tómate un instante: ¿qué ha alimentado hoy tu reflexión sobre la relación que estás construyendo?",
    ],
    pt: [
      "Estou aqui para o/a ajudar a refletir, não para decidir por si. Diga-me em que ponto do percurso está e proporei perguntas para avançar.",
      "Reserve um instante: o que, no seu dia, alimentou a sua reflexão sobre a relação que está a construir?",
    ],
  },
  DISCOVERY: {
    fr: [
      "En Découverte, l'essentiel est la vérité sans surexposition. Trois pistes : Qu'est-ce qui te motive vraiment dans cette rencontre ? Quelle place la foi tient-elle dans ton quotidien ? Quelle est ta vision d'une famille ?",
    ],
    en: [
      "In Discovery, what matters is truth without overexposure. Three leads: What truly motivates you in this encounter? What place does faith hold in your daily life? What is your vision of a family?",
    ],
    es: [
      "En Descubrimiento, lo esencial es la verdad sin sobreexposición. Tres pistas: ¿Qué te motiva realmente en este encuentro? ¿Qué lugar ocupa la fe en tu día a día? ¿Cuál es tu visión de una familia?",
    ],
    pt: [
      "Na Descoberta, o essencial é a verdade sem sobre-exposição. Três pistas: O que o/a motiva verdadeiramente neste encontro? Que lugar ocupa a fé no seu dia a dia? Qual é a sua visão de uma família?",
    ],
  },
  DIALOGUE: {
    fr: [
      "Le Dialogue sert à couvrir les thèmes qui comptent : foi, famille, enfants, finances, blessures à partager à ton rythme. Lequel n'avez-vous pas encore abordé ? Je peux t'aider à formuler une question douce pour l'ouvrir.",
    ],
    en: [
      "Dialogue is for covering the themes that matter: faith, family, children, finances, wounds shared at your own pace. Which one haven't you addressed yet? I can help you phrase a gentle question to open it.",
    ],
    es: [
      "El Diálogo sirve para cubrir los temas que importan: fe, familia, hijos, finanzas, heridas compartidas a tu ritmo. ¿Cuál no habéis abordado aún? Puedo ayudarte a formular una pregunta suave para abrirlo.",
    ],
    pt: [
      "O Diálogo serve para cobrir os temas que importam: fé, família, filhos, finanças, feridas partilhadas ao seu ritmo. Qual ainda não abordaram? Posso ajudar a formular uma pergunta delicada para o abrir.",
    ],
  },
  DISCERNMENT: {
    fr: [
      "Le Discernement n'est pas un verdict : c'est regarder ensemble les compatibilités et les sujets à approfondir. Regarde votre carte : quel sujet marqué « à approfondir » te semble le plus important à éclaircir cette semaine ?",
    ],
    en: [
      "Discernment is not a verdict: it's looking together at compatibilities and topics to explore. Look at your map: which topic marked \"to deepen\" seems most important to clarify this week?",
    ],
    es: [
      "El Discernimiento no es un veredicto: es mirar juntos las compatibilidades y los temas por profundizar. Mira vuestra carta: ¿qué tema marcado «por profundizar» te parece más importante aclarar esta semana?",
    ],
    pt: [
      "O Discernimento não é um veredito: é olhar juntos para as compatibilidades e os temas a aprofundar. Olhe para o vosso mapa: que tema marcado «a aprofundar» parece mais importante esclarecer esta semana?",
    ],
  },
  ACCOMPANIMENT: {
    fr: [
      "À cette étape, un regard extérieur qualifié fait toute la différence. Un coach ne verra jamais vos conversations sans votre consentement à tous les deux. Souhaites-tu préparer les points que tu aimerais aborder avec lui ?",
    ],
    en: [
      "At this stage, a qualified outside perspective makes all the difference. A coach will never see your conversations without both your consents. Would you like to prepare the points you'd want to raise?",
    ],
    es: [
      "En esta etapa, una mirada externa cualificada marca la diferencia. Un coach nunca verá vuestras conversaciones sin el consentimiento de ambos. ¿Quieres preparar los puntos que te gustaría abordar?",
    ],
    pt: [
      "Nesta etapa, um olhar externo qualificado faz toda a diferença. Um coach nunca verá as vossas conversas sem o consentimento de ambos. Quer preparar os pontos que gostaria de abordar?",
    ],
  },
  COMMITMENT: {
    fr: [
      "Avant l'engagement, la checklist mérite d'être honnête : finances, familles, blessures importantes, enfants, église, limites avant le mariage. Y a-t-il un point que vous avez évité jusqu'ici ? C'est le moment de l'ouvrir, avec douceur.",
    ],
    en: [
      "Before commitment, the checklist deserves honesty: finances, families, important wounds, children, church, boundaries before marriage. Is there a point you've avoided so far? Now is the time to open it, gently.",
    ],
    es: [
      "Antes del compromiso, la lista merece honestidad: finanzas, familias, heridas importantes, hijos, iglesia, límites antes del matrimonio. ¿Hay algún punto que habéis evitado? Es el momento de abrirlo, con suavidad.",
    ],
    pt: [
      "Antes do compromisso, a lista merece honestidade: finanças, famílias, feridas importantes, filhos, igreja, limites antes do casamento. Há algum ponto que evitaram até agora? É o momento de o abrir, com delicadeza.",
    ],
  },
  MARRIAGE_PREPARATION: {
    fr: [
      "La préparation au mariage se construit module par module : fondements, communication, finances, famille élargie, pardon. Quel module vous attire le plus en ce moment ? Un accompagnateur peut vous guider à travers chacun.",
    ],
    en: [
      "Marriage preparation is built module by module: foundations, communication, finances, extended family, forgiveness. Which module draws you most right now? A companion can guide you through each one.",
    ],
    es: [
      "La preparación al matrimonio se construye módulo a módulo: fundamentos, comunicación, finanzas, familia extendida, perdón. ¿Qué módulo os atrae más ahora? Un acompañante puede guiaros en cada uno.",
    ],
    pt: [
      "A preparação para o casamento constrói-se módulo a módulo: fundamentos, comunicação, finanças, família alargada, perdão. Que módulo vos atrai mais agora? Um acompanhante pode guiar-vos em cada um.",
    ],
  },
};

export function fallbackResponse(
  question: string,
  stage: AllianceStage | null,
  locale: Locale,
): string {
  const key: StageKey =
    stage && stage !== "CLOSED" ? stage : "GENERAL";
  const pool = RESPONSES[key][locale] ?? RESPONSES[key].fr;
  // Déterministe : choix par longueur de question (pas d'aléatoire).
  return pool[question.length % pool.length];
}
