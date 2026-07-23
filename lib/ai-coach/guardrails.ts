import type { Locale } from "@/lib/core-engine";
import { emergencyLine } from "@/lib/emergency";
import { sanitizeText } from "@/lib/security/sensitive-text";

/**
 * Garde-fous spirituels du coach IA.
 * Sujets sensibles -> redirection vers un accompagnateur humain.
 * L'IA n'affirme JAMAIS une volonté divine ni ne décide à la place de l'utilisateur.
 */
export type CoachSafetyTopic =
  | "crisis"
  | "abuse"
  | "spiritual_authority"
  | "sensitive";

function normalizeForSafety(text: string): string {
  return sanitizeText(text)
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[’`]/g, "'")
    .toLowerCase();
}

const CRISIS_PATTERNS: RegExp[] = [
  /\b(?:je (?:veux|vais|compte|souhaite) (?:mourir|me tuer|en finir)|je ne veux plus vivre|m'enlever la vie|me faire du mal|suicid(?:e|aire)?|automutil)/,
  /\b(?:i (?:want|plan|am going) to (?:die|kill myself|end my life)|i do not want to live|hurt myself|suicid(?:e|al)?|self[- ]harm)/,
  /\b(?:quiero (?:morir|matarme)|voy a matarme|quitarme la vida|no quiero vivir|hacerme dano|suicid)/,
  /\b(?:quero (?:morrer|me matar)|vou me matar|tirar a minha vida|nao quero viver|fazer mal a mim|suicid)/,
];

const ABUSE_PATTERNS: RegExp[] = [
  /\b(?:il|elle|mon (?:partenaire|conjoint)|ma conjointe)\s+me\s+(?:controle|terrorise|menace|frappe|force|isole|surveille|humilie|fait peur)/,
  /\b(?:j'ai peur de (?:lui|elle)|sans mon consentement|violence conjugale|abus(?:if)?|coercition|emprise)\b/,
  /\b(?:he|she|my (?:partner|spouse))\s+(?:controls|terrorizes|threatens|hits|forces|isolates|stalks|humiliates)\s+me\b/,
  /\b(?:i am afraid of (?:him|her)|without my consent|domestic violence|abuse|coercion)\b/,
  /\b(?:me controla|me aterroriza|me amenaza|me golpea|me obliga|sin mi consentimiento|violencia domestica|abuso|coaccion)\b/,
  /\b(?:me controla|me aterroriza|me ameaca|me bate|me obriga|sem meu consentimento|violencia domestica|abuso|coacao)\b/,
];

const SPIRITUAL_AUTHORITY_PATTERNS: RegExp[] = [
  /\b(?:dieu|le seigneur)\s+(?:veut(?:-il)?|approuve|confirme|a choisi|m'a dit|me dit)\b/,
  /\b(?:dis[- ]moi|confirme[- ]moi).{0,50}\b(?:dieu|seigneur)\b/,
  /\b(?:volonte de dieu|la bonne personne|dois[- ]je|devrais[- ]je|faut[- ]il).{0,60}\b(?:marier|mariage|epouser|quitter|rompre|union)\b/,
  /\b(?:god|the lord)\s+(?:wants|approves|confirms|chose|told me)\b/,
  /\b(?:god's will|the right person|should i|must i).{0,60}\b(?:marry|leave|break up|relationship)\b/,
  /\b(?:dios|el senor)\s+(?:quiere|aprueba|confirma|eligio|me dijo)\b/,
  /\b(?:voluntad de dios|la persona correcta|debo|deberia).{0,60}\b(?:casarme|dejarlo|romper|relacion)\b/,
  /\b(?:deus|o senhor)\s+(?:quer|aprova|confirma|escolheu|me disse)\b/,
  /\b(?:vontade de deus|a pessoa certa|devo|deveria).{0,60}\b(?:casar|deixar|terminar|relacao)\b/,
];

const SENSITIVE_PATTERNS: RegExp[] = [
  /\b(?:sexualite|sexuality|sexualidad|sexualidade|intimite physique)\b/,
  /\b(?:rupture|breakup|separation|divorce|rompimiento|separacao)\b/,
  /\b(?:detresse|deprim|depress|anxi|angoisse|panic|panique|manipul)\b/,
];

export function classifyCoachSafetyTopic(
  text: string,
): CoachSafetyTopic | null {
  const normalized = normalizeForSafety(text);
  if (CRISIS_PATTERNS.some((re) => re.test(normalized))) return "crisis";
  if (ABUSE_PATTERNS.some((re) => re.test(normalized))) return "abuse";
  if (SPIRITUAL_AUTHORITY_PATTERNS.some((re) => re.test(normalized))) {
    return "spiritual_authority";
  }
  if (SENSITIVE_PATTERNS.some((re) => re.test(normalized))) return "sensitive";
  return null;
}

export function isSensitiveTopic(text: string): boolean {
  return classifyCoachSafetyTopic(text) !== null;
}

const UNSAFE_OUTPUT_PATTERNS: RegExp[] = [
  /\b(?:dieu|le seigneur)\s+(?:veut|approuve|confirme|a choisi)\b/,
  /\b(?:god|the lord)\s+(?:wants|approves|confirms|chose)\b/,
  /\b(?:dios|el senor)\s+(?:quiere|aprueba|confirma|eligio)\b/,
  /\b(?:deus|o senhor)\s+(?:quer|aprova|confirma|escolheu)\b/,
  /\b(?:tu dois|vous devez|you (?:must|should)|debes|deberias|deves|deverias).{0,50}\b(?:te marier|vous marier|marry|quitter|leave|rompre|break up|casarte|casar)\b/,
  /\b(?:c'est la bonne personne|this is the right person|es la persona correcta|e a pessoa certa)\b/,
];

/** Validation de défense en profondeur APRES génération par un fournisseur. */
export function isUnsafeCoachOutput(text: string): boolean {
  const normalized = normalizeForSafety(text);
  return UNSAFE_OUTPUT_PATTERNS.some((re) => re.test(normalized));
}

export const SYSTEM_PROMPT = `Tu es le Coach IA de Chemin d'Alliance, une plateforme chrétienne de discernement vers le mariage.

RÈGLES ABSOLUES, sans exception :
1. Tu accompagnes le discernement, tu ne décides JAMAIS à la place de la personne.
2. Tu n'affirmes JAMAIS connaître ou transmettre la volonté de Dieu. Tu ne prophétises jamais.
3. Tu ne dis jamais "vous devez vous marier" ni "c'est la bonne personne".
4. Sur les sujets sensibles (décision de mariage, sexualité, rupture, détresse, abus),
   tu réponds avec douceur et tu rediriges vers un accompagnateur humain vérifié.
5. Tu ne poses aucun diagnostic médical ou psychologique.
6. Tu n'encourages jamais quelqu'un à rester dans une relation abusive.
7. Ton ton est bienveillant, sobre, respectueux de la foi chrétienne (évangélique et catholique).
8. Tu réponds dans la langue de l'utilisateur (fr, en, es, pt).
9. Tu proposes des questions ouvertes et des pistes de réflexion, jamais des verdicts.`;

const CRISIS_TEXTS: Record<Locale, string> = {
  fr: "Ce que tu décris peut signaler un danger immédiat. Ta sécurité passe avant cette conversation : éloigne-toi de tout moyen de te faire du mal, contacte maintenant une personne de confiance et un professionnel. Je ne vais pas transmettre cette demande à une IA.",
  en: "What you describe may signal immediate danger. Your safety comes before this conversation: move away from anything you could use to harm yourself, contact a trusted person and a professional now. I will not send this request to an AI.",
  es: "Lo que describes puede indicar un peligro inmediato. Tu seguridad está antes que esta conversación: aléjate de cualquier medio con el que puedas hacerte daño y contacta ahora con una persona de confianza y un profesional. No enviaré esta solicitud a una IA.",
  pt: "O que descreves pode indicar perigo imediato. A tua segurança vem antes desta conversa: afasta-te de qualquer meio de te magoares e contacta agora uma pessoa de confiança e um profissional. Não enviarei este pedido a uma IA.",
};

const ABUSE_TEXTS: Record<Locale, string> = {
  fr: "Ce que tu décris ressemble à une situation de contrôle ou de violence. Rien de cela n'est de ta faute et ta sécurité passe avant la relation. Contacte dès maintenant une personne de confiance et une structure professionnelle, sans confronter seul·e la personne si cela augmente le danger. Je ne vais pas transmettre cette demande à une IA.",
  en: "What you describe sounds like control or abuse. None of this is your fault, and your safety comes before the relationship. Contact a trusted person and a professional service now; do not confront the person alone if that could increase the danger. I will not send this request to an AI.",
  es: "Lo que describes parece una situación de control o violencia. Nada de esto es culpa tuya y tu seguridad está antes que la relación. Contacta ahora con una persona de confianza y un servicio profesional; no te enfrentes a la persona a solas si eso aumenta el peligro. No enviaré esta solicitud a una IA.",
  pt: "O que descreves parece uma situação de controlo ou violência. Nada disto é culpa tua e a tua segurança vem antes da relação. Contacta agora uma pessoa de confiança e um serviço profissional; não confrontes a pessoa a sós se isso aumentar o perigo. Não enviarei este pedido a uma IA.",
};

export function guardrailResponse(
  locale: Locale,
  topic: CoachSafetyTopic = "sensitive",
  country?: string,
): {
  text: string;
  guardrail: true;
} {
  if (topic === "crisis" || topic === "abuse") {
    const lead =
      topic === "crisis" ? CRISIS_TEXTS[locale] : ABUSE_TEXTS[locale];
    return {
      text: `${lead} ${emergencyLine(country, locale)}`,
      guardrail: true,
    };
  }

  const texts: Record<Locale, string> = {
    fr: "Cette question touche quelque chose de profond, et elle mérite mieux qu'une réponse d'IA. Je peux t'aider à formuler tes propres critères, mais cette décision t'appartient - et un accompagnateur humain vérifié peut t'éclairer en profondeur. Veux-tu que je te montre les coachs disponibles ?",
    en: "This question touches something deep, and it deserves more than an AI answer. I can help you shape your own criteria, but this decision is yours - and a verified human companion can shed deeper light. Would you like to see the available coaches?",
    es: "Esta pregunta toca algo profundo y merece más que una respuesta de IA. Puedo ayudarte a formular tus propios criterios, pero esta decisión te pertenece - y un acompañante humano verificado puede iluminarte en profundidad. ¿Quieres ver los coaches disponibles?",
    pt: "Esta pergunta toca algo profundo e merece mais do que uma resposta de IA. Posso ajudá-lo/a a formular os seus próprios critérios, mas esta decisão pertence-lhe - e um acompanhante humano verificado pode esclarecer em profundidade. Quer ver os coaches disponíveis?",
  };
  return { text: texts[locale], guardrail: true };
}
