import type { Locale } from "@/lib/core-engine";

/**
 * Agent 5 - Sortie Digne. Deux rôles :
 * 1. détecter un silence asymétrique qui s'installe (anti-ghosting actif) ;
 * 2. aider à formuler une clôture respectueuse personnalisée.
 */
export const GHOSTING_THRESHOLD_DAYS = 7;

export function silenceDetected(
  lastOtherMessageAt: Date | null,
  lastMineAt: Date | null,
  now = new Date(),
): boolean {
  // L'autre a écrit en dernier et j'ai laissé passer le seuil sans répondre.
  if (!lastOtherMessageAt) return false;
  if (lastMineAt && lastMineAt > lastOtherMessageAt) return false;
  const days = (now.getTime() - lastOtherMessageAt.getTime()) / 86_400_000;
  return days >= GHOSTING_THRESHOLD_DAYS;
}

type ExitReason = "no_alignment" | "different_visions" | "need_pause" | "other";

const EXIT_TEMPLATES: Record<Locale, Record<ExitReason, string>> = {
  fr: {
    no_alignment:
      "Merci pour le chemin parcouru et pour nos échanges. Je ne ressens pas l’alignement nécessaire pour poursuivre cette démarche. Je préfère te le dire avec honnêteté et respect, et je te souhaite une bonne continuation.",
    different_visions:
      "Merci pour ce que nous avons pu partager. Nos visions me semblent aujourd’hui trop différentes pour continuer ce chemin sereinement. Je préfère clôturer ici avec respect et te souhaite le meilleur pour la suite.",
    need_pause:
      "Merci pour nos échanges. J’ai besoin de prendre du recul et de ne pas poursuivre cette relation. Je souhaite clôturer notre démarche avec respect et te souhaite une suite paisible.",
    other:
      "Merci pour le temps et les échanges partagés. Après réflexion, je préfère ne pas poursuivre cette démarche. Je te le dis avec respect et te souhaite une bonne continuation.",
  },
  en: {
    no_alignment:
      "Thank you for the journey and our conversations. I do not feel the alignment needed to continue. I prefer to say this honestly and respectfully, and I wish you well.",
    different_visions:
      "Thank you for what we have shared. Our visions now seem too different to continue this journey peacefully. I prefer to close here with respect and wish you all the best.",
    need_pause:
      "Thank you for our conversations. I need to step back and not continue this relationship. I want to close our journey respectfully and wish you peace.",
    other:
      "Thank you for the time and conversations we shared. After reflection, I prefer not to continue this journey. I say this respectfully and wish you well.",
  },
  es: {
    no_alignment:
      "Gracias por el camino recorrido y por nuestras conversaciones. No siento la afinidad necesaria para continuar. Prefiero decirlo con honestidad y respeto, y te deseo lo mejor.",
    different_visions:
      "Gracias por lo que hemos compartido. Nuestras visiones me parecen hoy demasiado diferentes para continuar este camino con serenidad. Prefiero cerrar aquí con respeto y te deseo lo mejor.",
    need_pause:
      "Gracias por nuestras conversaciones. Necesito tomar distancia y no continuar esta relación. Quiero cerrar nuestro camino con respeto y te deseo una etapa serena.",
    other:
      "Gracias por el tiempo y las conversaciones compartidas. Después de reflexionar, prefiero no continuar este camino. Te lo digo con respeto y te deseo lo mejor.",
  },
  pt: {
    no_alignment:
      "Obrigado pelo caminho e pelas nossas conversas. Não sinto o alinhamento necessário para continuar. Prefiro dizê-lo com honestidade e respeito, e desejo-te tudo de bom.",
    different_visions:
      "Obrigado pelo que partilhámos. As nossas visões parecem-me hoje demasiado diferentes para continuar este caminho com serenidade. Prefiro terminar aqui com respeito e desejo-te o melhor.",
    need_pause:
      "Obrigado pelas nossas conversas. Preciso de recuar e não continuar esta relação. Quero terminar o nosso caminho com respeito e desejo-te uma etapa serena.",
    other:
      "Obrigado pelo tempo e pelas conversas partilhadas. Depois de refletir, prefiro não continuar este caminho. Digo-o com respeito e desejo-te tudo de bom.",
  },
};

export async function draftExitMessage(
  reason: ExitReason,
  personalNote: string,
  locale: Locale,
): Promise<string | null> {
  void personalNote;
  return EXIT_TEMPLATES[locale]?.[reason] ?? EXIT_TEMPLATES.fr[reason];
}
