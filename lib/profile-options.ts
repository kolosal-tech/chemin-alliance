/**
 * Listes de choix pour les champs de profil - alimentent les menus déroulants et
 * sélecteurs à puces du formulaire (au lieu de la saisie libre, plus longue et
 * source d'incohérences). Le matching compare ces valeurs par égalité de chaîne
 * (lib/matching.ts) : un vocabulaire fermé AMÉLIORE donc le scoring.
 *
 * VALEUR STOCKÉE = libellé français canonique (inchangé pour ne PAS casser le
 * matching ni migrer la base). L'AFFICHAGE est traduit à la volée par les
 * résolveurs ci-dessous (`optionLabel`, `localizeList`, `countryLabel`) selon la
 * locale courante. Les valeurs libres héritées restent supportées : un résolveur
 * sans correspondance renvoie la valeur brute.
 */

export type Locale = "fr" | "en" | "es" | "pt";

/** Carte valeur canonique → libellé par locale. */
type LabelMap = Record<string, Record<Locale, string>>;

// ─────────────────────────── Confession / dénomination ───────────────────────────
export const DENOMINATIONS = [
  "Catholique",
  "Évangélique",
  "Pentecôtiste",
  "Baptiste",
  "Assemblées de Dieu",
  "Méthodiste",
  "Presbytérienne / Réformée",
  "Adventiste",
  "Orthodoxe",
  "Autre",
] as const;

export const DENOMINATION_LABELS: LabelMap = {
  Catholique: {
    fr: "Catholique",
    en: "Catholic",
    es: "Católica",
    pt: "Católica",
  },
  Évangélique: {
    fr: "Évangélique",
    en: "Evangelical",
    es: "Evangélica",
    pt: "Evangélica",
  },
  Pentecôtiste: {
    fr: "Pentecôtiste",
    en: "Pentecostal",
    es: "Pentecostal",
    pt: "Pentecostal",
  },
  Baptiste: { fr: "Baptiste", en: "Baptist", es: "Bautista", pt: "Batista" },
  "Assemblées de Dieu": {
    fr: "Assemblées de Dieu",
    en: "Assemblies of God",
    es: "Asambleas de Dios",
    pt: "Assembleias de Deus",
  },
  Méthodiste: {
    fr: "Méthodiste",
    en: "Methodist",
    es: "Metodista",
    pt: "Metodista",
  },
  "Presbytérienne / Réformée": {
    fr: "Presbytérienne / Réformée",
    en: "Presbyterian / Reformed",
    es: "Presbiteriana / Reformada",
    pt: "Presbiteriana / Reformada",
  },
  Adventiste: {
    fr: "Adventiste",
    en: "Adventist",
    es: "Adventista",
    pt: "Adventista",
  },
  Orthodoxe: {
    fr: "Orthodoxe",
    en: "Orthodox",
    es: "Ortodoxa",
    pt: "Ortodoxa",
  },
  Autre: { fr: "Autre", en: "Other", es: "Otra", pt: "Outra" },
};

// Variantes héritées (saisie libre avant la liste curée) -> valeur canonique.
// Evite les doublons dans le menu : « Assemblée de Dieu » (singulier, faux) et
// « Assemblées de Dieu » (pluriel, correct) ne doivent pas coexister.
const DENOMINATION_ALIASES: Record<string, string> = {
  "assemblée de dieu": "Assemblées de Dieu",
  "assemblee de dieu": "Assemblées de Dieu",
  "assemblees de dieu": "Assemblées de Dieu",
};

/** Normalise une dénomination héritée vers la valeur canonique de la liste. */
export function canonicalDenomination(value?: string | null): string {
  if (!value) return "";
  const v = value.trim();
  return DENOMINATION_ALIASES[v.toLowerCase()] ?? v;
}

// ─────────────────────────── Fréquence d'engagement ───────────────────────────
export const ENGAGEMENT_FREQUENCIES = [
  "Chaque semaine",
  "Plusieurs fois par mois",
  "Une fois par mois",
  "Occasionnellement",
  "Pas encore",
] as const;

export const ENGAGEMENT_LABELS: LabelMap = {
  "Chaque semaine": {
    fr: "Chaque semaine",
    en: "Every week",
    es: "Cada semana",
    pt: "Toda semana",
  },
  "Plusieurs fois par mois": {
    fr: "Plusieurs fois par mois",
    en: "Several times a month",
    es: "Varias veces al mes",
    pt: "Várias vezes por mês",
  },
  "Une fois par mois": {
    fr: "Une fois par mois",
    en: "Once a month",
    es: "Una vez al mes",
    pt: "Uma vez por mês",
  },
  Occasionnellement: {
    fr: "Occasionnellement",
    en: "Occasionally",
    es: "Ocasionalmente",
    pt: "Ocasionalmente",
  },
  "Pas encore": {
    fr: "Pas encore",
    en: "Not yet",
    es: "Todavía no",
    pt: "Ainda não",
  },
};

// ─────────────────────────── Centres d'intérêt ───────────────────────────
export const INTERESTS = [
  "Lecture",
  "Musique",
  "Sport",
  "Cuisine",
  "Voyages",
  "Cinéma",
  "Nature",
  "Art",
  "Bénévolat",
  "Jeux",
  "Technologie",
  "Mode",
  "Danse",
  "Photographie",
] as const;

export const INTEREST_LABELS: LabelMap = {
  Lecture: { fr: "Lecture", en: "Reading", es: "Lectura", pt: "Leitura" },
  Musique: { fr: "Musique", en: "Music", es: "Música", pt: "Música" },
  Sport: { fr: "Sport", en: "Sports", es: "Deporte", pt: "Esporte" },
  Cuisine: { fr: "Cuisine", en: "Cooking", es: "Cocina", pt: "Culinária" },
  Voyages: { fr: "Voyages", en: "Travel", es: "Viajes", pt: "Viagens" },
  Cinéma: { fr: "Cinéma", en: "Cinema", es: "Cine", pt: "Cinema" },
  Nature: { fr: "Nature", en: "Nature", es: "Naturaleza", pt: "Natureza" },
  Art: { fr: "Art", en: "Art", es: "Arte", pt: "Arte" },
  Bénévolat: {
    fr: "Bénévolat",
    en: "Volunteering",
    es: "Voluntariado",
    pt: "Voluntariado",
  },
  Jeux: { fr: "Jeux", en: "Games", es: "Juegos", pt: "Jogos" },
  Technologie: {
    fr: "Technologie",
    en: "Technology",
    es: "Tecnología",
    pt: "Tecnologia",
  },
  Mode: { fr: "Mode", en: "Fashion", es: "Moda", pt: "Moda" },
  Danse: { fr: "Danse", en: "Dance", es: "Baile", pt: "Dança" },
  Photographie: {
    fr: "Photographie",
    en: "Photography",
    es: "Fotografía",
    pt: "Fotografia",
  },
};

// ─────────────────────────── Traits de caractère ───────────────────────────
export const PERSONALITY_TRAITS = [
  "Calme",
  "Énergique",
  "Réfléchi·e",
  "Spontané·e",
  "Organisé·e",
  "Créatif·ve",
  "Sociable",
  "Réservé·e",
  "Optimiste",
  "Patient·e",
  "Ambitieux·se",
  "Bienveillant·e",
  "Drôle",
  "Aventureux·se",
] as const;

export const PERSONALITY_LABELS: LabelMap = {
  Calme: { fr: "Calme", en: "Calm", es: "Tranquilo·a", pt: "Calmo·a" },
  Énergique: {
    fr: "Énergique",
    en: "Energetic",
    es: "Enérgico·a",
    pt: "Enérgico·a",
  },
  "Réfléchi·e": {
    fr: "Réfléchi·e",
    en: "Thoughtful",
    es: "Reflexivo·a",
    pt: "Reflexivo·a",
  },
  "Spontané·e": {
    fr: "Spontané·e",
    en: "Spontaneous",
    es: "Espontáneo·a",
    pt: "Espontâneo·a",
  },
  "Organisé·e": {
    fr: "Organisé·e",
    en: "Organized",
    es: "Organizado·a",
    pt: "Organizado·a",
  },
  "Créatif·ve": {
    fr: "Créatif·ve",
    en: "Creative",
    es: "Creativo·a",
    pt: "Criativo·a",
  },
  Sociable: { fr: "Sociable", en: "Sociable", es: "Sociable", pt: "Sociável" },
  "Réservé·e": {
    fr: "Réservé·e",
    en: "Reserved",
    es: "Reservado·a",
    pt: "Reservado·a",
  },
  Optimiste: {
    fr: "Optimiste",
    en: "Optimistic",
    es: "Optimista",
    pt: "Otimista",
  },
  "Patient·e": {
    fr: "Patient·e",
    en: "Patient",
    es: "Paciente",
    pt: "Paciente",
  },
  "Ambitieux·se": {
    fr: "Ambitieux·se",
    en: "Ambitious",
    es: "Ambicioso·a",
    pt: "Ambicioso·a",
  },
  "Bienveillant·e": {
    fr: "Bienveillant·e",
    en: "Caring",
    es: "Bondadoso·a",
    pt: "Bondoso·a",
  },
  Drôle: { fr: "Drôle", en: "Funny", es: "Divertido·a", pt: "Engraçado·a" },
  "Aventureux·se": {
    fr: "Aventureux·se",
    en: "Adventurous",
    es: "Aventurero·a",
    pt: "Aventureiro·a",
  },
};

// ─────────────────────────── Pays ───────────────────────────
// Valeur stockée = nom français canonique (matching inchangé). Le libellé
// affiché est dérivé du code ISO via Intl.DisplayNames → noms localisés gratuits
// et corrects dans les 4 langues, sans dépendance ni table de 300 entrées.
// Couverture : sphères francophone, anglophone, lusophone, hispanophone.
const COUNTRY_DATA: ReadonlyArray<readonly [name: string, code: string]> = [
  // Afrique de l'Ouest & centrale francophone
  ["Burkina Faso", "BF"],
  ["Côte d'Ivoire", "CI"],
  ["Mali", "ML"],
  ["Niger", "NE"],
  ["Sénégal", "SN"],
  ["Togo", "TG"],
  ["Bénin", "BJ"],
  ["Ghana", "GH"],
  ["Nigéria", "NG"],
  ["Cameroun", "CM"],
  ["Tchad", "TD"],
  ["Guinée", "GN"],
  ["Congo (RDC)", "CD"],
  ["Congo (Brazzaville)", "CG"],
  ["Gabon", "GA"],
  ["Centrafrique", "CF"],
  ["Mauritanie", "MR"],
  ["Rwanda", "RW"],
  ["Burundi", "BI"],
  ["Djibouti", "DJ"],
  ["Comores", "KM"],
  ["Madagascar", "MG"],
  ["Guinée équatoriale", "GQ"],
  // Maghreb
  ["Maroc", "MA"],
  ["Algérie", "DZ"],
  ["Tunisie", "TN"],
  // Europe & Amérique du Nord francophone
  ["France", "FR"],
  ["Belgique", "BE"],
  ["Suisse", "CH"],
  ["Luxembourg", "LU"],
  ["Monaco", "MC"],
  ["Canada", "CA"],
  ["Haïti", "HT"],
  // Anglophone
  ["États-Unis", "US"],
  ["Royaume-Uni", "GB"],
  ["Irlande", "IE"],
  ["Australie", "AU"],
  ["Nouvelle-Zélande", "NZ"],
  ["Afrique du Sud", "ZA"],
  ["Kenya", "KE"],
  ["Ouganda", "UG"],
  ["Tanzanie", "TZ"],
  ["Zambie", "ZM"],
  ["Zimbabwe", "ZW"],
  ["Inde", "IN"],
  ["Philippines", "PH"],
  ["Jamaïque", "JM"],
  ["Trinité-et-Tobago", "TT"],
  // Lusophone
  ["Portugal", "PT"],
  ["Brésil", "BR"],
  ["Angola", "AO"],
  ["Mozambique", "MZ"],
  ["Cap-Vert", "CV"],
  ["Guinée-Bissau", "GW"],
  ["São Tomé-et-Príncipe", "ST"],
  // Hispanophone
  ["Espagne", "ES"],
  ["Mexique", "MX"],
  ["Argentine", "AR"],
  ["Colombie", "CO"],
  ["Pérou", "PE"],
  ["Chili", "CL"],
  ["Venezuela", "VE"],
  ["Équateur", "EC"],
  ["Bolivie", "BO"],
  ["Paraguay", "PY"],
  ["Uruguay", "UY"],
  ["Guatemala", "GT"],
  ["Honduras", "HN"],
  ["El Salvador", "SV"],
  ["Nicaragua", "NI"],
  ["Costa Rica", "CR"],
  ["Panama", "PA"],
  ["République dominicaine", "DO"],
  ["Cuba", "CU"],
  ["Porto Rico", "PR"],
];

const COUNTRY_CODE_BY_NAME: Record<string, string> = Object.fromEntries(
  COUNTRY_DATA.map(([name, code]) => [name, code]),
);

/** Valeurs canoniques stockables (nom français) + « Autre ». */
export const COUNTRIES: readonly string[] = [
  ...COUNTRY_DATA.map(([name]) => name),
  "Autre",
];

const OTHER_COUNTRY_LABEL: Record<Locale, string> = {
  fr: "Autre",
  en: "Other",
  es: "Otro",
  pt: "Outro",
};

// ─────────────────────────── Résolveurs d'affichage ───────────────────────────
function asLocale(locale: string): Locale {
  return locale === "en" || locale === "es" || locale === "pt" ? locale : "fr";
}

/** Libellé localisé d'une valeur de liste fermée ; valeur brute si inconnue. */
export function optionLabel(
  value: string | null | undefined,
  labels: LabelMap,
  locale: string,
): string {
  if (!value) return "";
  return labels[value]?.[asLocale(locale)] ?? value;
}

/** Localise une chaîne CSV (« Lecture, Sport ») vers la locale courante. */
export function localizeList(
  csv: string | null | undefined,
  labels: LabelMap,
  locale: string,
): string {
  if (!csv) return "";
  return csv
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((v) => optionLabel(v, labels, locale))
    .join(", ");
}

/** Nom de pays localisé (Intl.DisplayNames) ; gère « Autre » et valeurs libres. */
export function countryLabel(
  value: string | null | undefined,
  locale: string,
): string {
  if (!value) return "";
  if (value === "Autre") return OTHER_COUNTRY_LABEL[asLocale(locale)];
  const code = COUNTRY_CODE_BY_NAME[value];
  if (code) {
    try {
      return (
        new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? value
      );
    } catch {
      return value;
    }
  }
  return value;
}
