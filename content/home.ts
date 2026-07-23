/**
 * Configuration centrale de la homepage marketing - Chemin d'Alliance.
 *
 * Ce fichier ne contient AUCUN texte localisé : tout libellé affiché vit dans
 * `messages/<locale>.json` sous le namespace `home` et se référence ici par
 * `id` (cf. règle i18n). On centralise ici la STRUCTURE et les données non
 * traduisibles : URLs, identifiants, ordres, dégradés de placeholders,
 * références d'icônes.
 *
 * Aucun visuel/logo réel - uniquement des placeholders fictifs et du line-art.
 */

/** Variante d'icône line-art rendue côté composant (clé → SVG). */
export type IconKey =
  | "shield"
  | "compass"
  | "door"
  | "people"
  | "charity"
  | "respect"
  | "purity"
  | "truth";

/* ------------------------------------------------------------------ */
/* « Pourquoi nous » - nos forces différenciantes.                     */
/* ------------------------------------------------------------------ */
export const whyUs: { id: string; icon: IconKey }[] = [
  { id: "privacy", icon: "shield" },
  { id: "guidance", icon: "compass" },
  { id: "exit", icon: "door" },
  { id: "community", icon: "people" },
];

/* ------------------------------------------------------------------ */
/* Les 6 étapes du parcours d'Alliance - timeline gamifiée.            */
/* `n` = numéro d'étape ; alimente la jauge de progression.            */
/* ------------------------------------------------------------------ */
export const journeySteps: { id: string; n: number }[] = [
  { id: "discovery", n: 1 },
  { id: "dialogue", n: 2 },
  { id: "discernment", n: 3 },
  { id: "accompaniment", n: 4 },
  { id: "engagement", n: 5 },
  { id: "preparation", n: 6 },
];

/* ------------------------------------------------------------------ */
/* 4 valeurs.                                                          */
/* ------------------------------------------------------------------ */
export const values: { id: string; icon: IconKey }[] = [
  { id: "charity", icon: "charity" },
  { id: "respect", icon: "respect" },
  { id: "purity", icon: "purity" },
  { id: "truth", icon: "truth" },
];

/* ------------------------------------------------------------------ */
/* Téléchargement appli - placeholders de stores + PWA.                */
/* ------------------------------------------------------------------ */
export const appLinks = {
  appStore: "#", // placeholder - à remplacer par l'URL App Store réelle
  googlePlay: "#", // placeholder - à remplacer par l'URL Play Store réelle
} as const;

/* ------------------------------------------------------------------ */
/* Pied de page - structure de navigation (libellés via i18n).         */
/* `href` interne (next-intl Link).                                     */
/* ------------------------------------------------------------------ */
export const footerNav: {
  section: "product" | "resources" | "legal";
  links: { id: string; href: string }[];
}[] = [
  {
    section: "product",
    links: [
      { id: "mission", href: "/mission" },
      { id: "journey", href: "/#journey" },
      { id: "download", href: "/#download" },
    ],
  },
  {
    section: "resources",
    links: [
      { id: "blog", href: "/blog" },
      { id: "guides", href: "/guides" },
      { id: "help", href: "mailto:alliance@kolosaltech.com" },
    ],
  },
  {
    section: "legal",
    links: [
      { id: "terms", href: "/legal/terms" },
      { id: "cookies", href: "/legal/cookies" },
      { id: "privacy", href: "/legal/privacy" },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Avis notés (Deliverable 4) - citations dans i18n                    */
/* (`product.reviews.items.<id>.quote`). `gradient` = avatar placeholder.*/
/* ------------------------------------------------------------------ */
export const reviews: {
  id: string;
  name: string;
  /** note entière 1–5 */
  rating: number;
  gradient: string;
}[] = [
  { id: "r1", name: "Naomi", rating: 5, gradient: "from-gold/70 to-navy" },
  { id: "r2", name: "David", rating: 5, gradient: "from-sage to-navy" },
  {
    id: "r3",
    name: "Priscille",
    rating: 4,
    gradient: "from-amberink to-night",
  },
];
