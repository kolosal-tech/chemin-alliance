import type { Locale } from "@/lib/core-engine";
import { completeText } from "./llm";

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

const SYSTEM = `Tu aides à rédiger un message de clôture de relation, digne et respectueux,
dans un contexte chrétien de discernement vers le mariage.
Règles : 2-4 phrases ; honnête sans blesser ; gratitude sincère ; AUCUNE formule
manipulatrice ("Dieu m'a dit", "ce n'est pas la volonté de Dieu") ; pas de reproche ;
tutoiement doux ; tu réponds uniquement avec le message, rien d'autre.`;

export async function draftExitMessage(
  reason: ExitReason,
  personalNote: string,
  locale: Locale,
): Promise<string | null> {
  return completeText(
    `${SYSTEM}\nLangue: ${locale}.`,
    `Raison choisie: ${reason}. Ce que la personne veut transmettre: ${personalNote || "(rien de précis)"}`,
    300,
    locale,
  );
}
