/**
 * Banque de questions curatee du jeu de couple/match (construction C, hybride,
 * SANS FIN). Ce module ne contient AUCUN texte : les textes des questions
 * vivent en i18n, namespace `couple_game.questions.<key>` dans
 * messages/{fr,en,es,pt}.json (parite stricte des cles entre les 4 langues,
 * verifiee par tests/couple-game-i18n.test.ts).
 *
 * Zero I/O, zero dependance a next-intl : donnees pures, utilisables aussi
 * bien cote serveur (API routes) que cote client (composant de jeu partage).
 *
 * Le "curseur" d'une surface (match ou espace couple) est le nombre de
 * manches deja creees pour cette surface. `questionKeyForIndex` transforme ce
 * curseur en cle de question via un modulo : une fois la banque parcourue,
 * on reboucle dessus (la creation d'une manche au-dela de QUESTION_COUNT-1
 * manches distinctes appelle plutot le LLM cote appelant pour generer une
 * question inedite - cette decision ne concerne pas ce module).
 */

export const QUESTION_COUNT = 24;

export const QUESTION_KEYS: readonly string[] = Array.from(
  { length: QUESTION_COUNT },
  (_, i) => `q${i + 1}`,
);

export function questionKeyForIndex(index: number): string {
  const i = ((index % QUESTION_COUNT) + QUESTION_COUNT) % QUESTION_COUNT;
  return QUESTION_KEYS[i];
}
