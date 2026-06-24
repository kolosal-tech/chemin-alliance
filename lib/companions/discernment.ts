/**
 * Outils de discernement IN-CHAT des Compagnons IA (P5). Donnees PURES, partagees
 * client (conversation.tsx) et serveur (route companion-tool) : un module = un
 * banc de questions de discernement curees, stockees en i18n sous
 * `discovery_ecosystem.discernment.<module>.q<n>` (1-indexe, x4 langues).
 *
 * Le Compagnon POSE la question (verbatim curee, deterministe) ; l'utilisateur
 * repond dans la saisie normale ; le Compagnon REAGIT via l'auto-reply LLM
 * existant (lib/companions/reply). Aucune table : la question est un Message du
 * Compagnon ; l'avancement (quel index) est porte par le client.
 */
export const DISCERNMENT_MODULES = [
  "deepQuestions",
  "emotionalDiscovery",
  "coupleFinances",
] as const;

export type DiscernmentModule = (typeof DISCERNMENT_MODULES)[number];

/** Nombre de questions par module (doit refleter l'i18n). */
export const DISCERNMENT_COUNT: Record<DiscernmentModule, number> = {
  deepQuestions: 5,
  emotionalDiscovery: 5,
  coupleFinances: 5,
};

export function isDiscernmentModule(x: string): x is DiscernmentModule {
  return (DISCERNMENT_MODULES as readonly string[]).includes(x);
}
