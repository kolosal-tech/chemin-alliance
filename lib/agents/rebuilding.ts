import type { Locale } from "@/lib/core-engine";

/**
 * Agent 6 - Reconstruction. Après une clôture : un chemin sobre en 4 pas
 * (déterministe, 4 langues) + un mot de consolation personnalisé si LLM.
 * Oriente vers les coachs humains, jamais vers la précipitation.
 */
export const REBUILDING_STEPS: Record<
  Locale,
  Array<{ title: string; body: string }>
> = {
  fr: [
    {
      title: "Accueillir",
      body: "Nommer ce que cette rencontre a remué, sans se juger. Une fin vécue avec dignité n'est pas un échec.",
    },
    {
      title: "Relire",
      body: "Qu'est-ce que ce chemin t'a appris sur toi, tes attentes, tes limites ? Écris-le quelque part.",
    },
    {
      title: "Être entouré·e",
      body: "Partage avec une personne de confiance - ami·e, pasteur, accompagnateur. Un coach vérifié peut t'aider à relire en profondeur.",
    },
    {
      title: "Repartir à ton rythme",
      body: "Rien ne presse. Tu reviendras vers la rencontre quand ton cœur sera disponible - et c'est toi qui le sentiras.",
    },
  ],
  en: [
    {
      title: "Welcome it",
      body: "Name what this encounter stirred, without judging yourself. An ending lived with dignity is not a failure.",
    },
    {
      title: "Look back",
      body: "What did this journey teach you about yourself, your expectations, your boundaries? Write it down.",
    },
    {
      title: "Be surrounded",
      body: "Share with someone you trust - friend, pastor, companion. A verified coach can help you process deeply.",
    },
    {
      title: "Set out again at your pace",
      body: "There is no rush. You will return to meeting others when your heart is available - and you will feel it.",
    },
  ],
  es: [
    {
      title: "Acoger",
      body: "Nombra lo que este encuentro removió, sin juzgarte. Un final vivido con dignidad no es un fracaso.",
    },
    {
      title: "Releer",
      body: "¿Qué te enseñó este camino sobre ti, tus expectativas, tus límites? Escríbelo.",
    },
    {
      title: "Estar acompañado/a",
      body: "Comparte con alguien de confianza - amistad, pastor, acompañante. Un coach verificado puede ayudarte a profundizar.",
    },
    {
      title: "Volver a tu ritmo",
      body: "Nada apremia. Volverás al encuentro cuando tu corazón esté disponible - y lo sentirás.",
    },
  ],
  pt: [
    {
      title: "Acolher",
      body: "Nomeie o que este encontro mexeu, sem se julgar. Um fim vivido com dignidade não é um fracasso.",
    },
    {
      title: "Reler",
      body: "O que este caminho lhe ensinou sobre si, as suas expectativas, os seus limites? Escreva-o.",
    },
    {
      title: "Estar acompanhado/a",
      body: "Partilhe com alguém de confiança - amigo/a, pastor, acompanhante. Um coach verificado pode ajudar a aprofundar.",
    },
    {
      title: "Recomeçar ao seu ritmo",
      body: "Nada apressa. Voltará ao encontro quando o seu coração estiver disponível - e vai senti-lo.",
    },
  ],
};

const CONSOLATION_WORDS: Record<Locale, string> = {
  fr: "Une relation qui se termine avec respect n’efface pas ce que tu as appris. Accorde-toi du temps, entoure-toi de personnes sûres et avance sans te presser. Ta dignité et ton rythme comptent.",
  en: "A relationship ending respectfully does not erase what you learned. Give yourself time, stay close to safe people, and move forward without rushing. Your dignity and your pace matter.",
  es: "Una relación que termina con respeto no borra lo que aprendiste. Date tiempo, rodéate de personas seguras y avanza sin prisa. Tu dignidad y tu ritmo importan.",
  pt: "Uma relação que termina com respeito não apaga o que aprendeste. Dá-te tempo, aproxima-te de pessoas seguras e avança sem pressa. A tua dignidade e o teu ritmo importam.",
};

export async function consolationWord(locale: Locale): Promise<string | null> {
  return CONSOLATION_WORDS[locale] ?? CONSOLATION_WORDS.fr;
}
