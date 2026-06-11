import type { Locale } from "@/lib/core-engine";

/**
 * Garde-fous spirituels du coach IA.
 * Sujets sensibles -> redirection vers un accompagnateur humain.
 * L'IA n'affirme JAMAIS une volonté divine ni ne décide à la place de l'utilisateur.
 */
const SENSITIVE_PATTERNS: RegExp[] = [
  /\b(dois[- ]je|devrais[- ]je|faut[- ]il).{0,40}(marier|mariage|épouser|quitter|rompre)\b/i,
  /\b(should i|must i).{0,40}(marry|leave|break up)\b/i,
  /\b(debo|debería).{0,40}(casarme|dejarlo|romper)\b/i,
  /\b(devo|deveria).{0,40}(casar|deixar|terminar)\b/i,
  /\b(la bonne personne|the right person|la persona correcta|a pessoa certa)\b/i,
  /\b(volonté de dieu|dieu m'a dit|god told me|god's will|voluntad de dios|vontade de deus)\b/i,
  /\b(sexualité|sexualite|sexuality|sexualidad|sexualidade|intimité physique)\b/i,
  /\b(rupture|breakup|ruptura|separação|separation|divorce)\b/i,
  /\b(détresse|detresse|suicid|déprim|deprim|depress|anxi|angoisse|me faire du mal|hurt myself)\b/i,
  /\b(abus|abuse|violence|violent|manipul)\b/i,
];

export function isSensitiveTopic(text: string): boolean {
  return SENSITIVE_PATTERNS.some((re) => re.test(text));
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

export function guardrailResponse(locale: Locale): {
  text: string;
  guardrail: true;
} {
  const texts: Record<Locale, string> = {
    fr: "Cette question touche quelque chose de profond, et elle mérite mieux qu'une réponse d'IA. Je peux t'aider à formuler tes propres critères, mais cette décision t'appartient — et un accompagnateur humain vérifié peut t'éclairer en profondeur. Veux-tu que je te montre les coachs disponibles ?",
    en: "This question touches something deep, and it deserves more than an AI answer. I can help you shape your own criteria, but this decision is yours — and a verified human companion can shed deeper light. Would you like to see the available coaches?",
    es: "Esta pregunta toca algo profundo y merece más que una respuesta de IA. Puedo ayudarte a formular tus propios criterios, pero esta decisión te pertenece — y un acompañante humano verificado puede iluminarte en profundidad. ¿Quieres ver los coaches disponibles?",
    pt: "Esta pergunta toca algo profundo e merece mais do que uma resposta de IA. Posso ajudá-lo/a a formular os seus próprios critérios, mas esta decisão pertence-lhe — e um acompanhante humano verificado pode esclarecer em profundidade. Quer ver os coaches disponíveis?",
  };
  return { text: texts[locale], guardrail: true };
}
