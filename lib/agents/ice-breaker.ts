import type { Locale } from "@/lib/core-engine";

const QUESTIONS: Record<Locale, readonly string[]> = {
  fr: [
    "Quel moment simple de ta semaine t’a donné de la joie",
    "Quelle valeur aimerais-tu voir grandir dans ton futur foyer",
    "Qu’est-ce qui t’aide à garder la paix quand une journée est chargée",
    "Quelle tradition familiale aimerais-tu transmettre",
    "Quel geste d’attention compte particulièrement pour toi",
    "Quel projet aimerais-tu construire à deux un jour",
  ],
  en: [
    "What simple moment brought you joy this week",
    "What value would you like to see grow in your future home",
    "What helps you stay peaceful when a day feels busy",
    "What family tradition would you like to pass on",
    "What thoughtful gesture means a lot to you",
    "What project would you like to build together one day",
  ],
  es: [
    "Qué momento sencillo te dio alegría esta semana",
    "Qué valor te gustaría ver crecer en tu futuro hogar",
    "Qué te ayuda a conservar la paz cuando el día está cargado",
    "Qué tradición familiar te gustaría transmitir",
    "Qué gesto de atención significa mucho para ti",
    "Qué proyecto te gustaría construir en pareja algún día",
  ],
  pt: [
    "Que momento simples te trouxe alegria esta semana",
    "Que valor gostarias de ver crescer no teu futuro lar",
    "O que te ajuda a manter a paz num dia exigente",
    "Que tradição familiar gostarias de transmitir",
    "Que gesto de atenção tem um significado especial para ti",
    "Que projeto gostarias de construir a dois um dia",
  ],
};

function stableIndex(seed: string, length: number): number {
  let hash = 2_166_136_261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0) % length;
}

/**
 * Question locale, sans profil ni texte utilisateur. Le seed technique rend
 * le résultat stable pour une relation et un membre sans être repris dans la
 * question.
 */
export function localIceBreaker(locale: Locale, seed: string): string {
  const questions = QUESTIONS[locale] ?? QUESTIONS.fr;
  return questions[stableIndex(seed, questions.length)];
}
