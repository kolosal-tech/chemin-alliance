// Base de connaissance culturelle et coutumière du mariage, par région.
// Objectif : permettre aux agents d'accompagner les us et coutumes du pays
// de la personne TOUJOURS dans le cadre biblique et théologique — en
// honorant la culture sans la placer au-dessus de l'Écriture.
//
// Principe : un même pays abrite plusieurs ethnies. La base donne le cadre
// régional ; l'agent DEMANDE toujours à la personne son pays et son ethnie
// pour préciser, puis aide à discerner ce qui est compatible avec la foi.

export type CultureRegion = {
  key: string;
  label: string;
  countries: string[]; // formes en minuscules pour la résolution
  customarySteps: string;
  biblicalFrame: string;
  cautions: string;
};

export const CULTURE_REGIONS: CultureRegion[] = [
  {
    key: "occident",
    label: "France, Europe & Amérique du Nord (Occident)",
    countries: [
      "france", "belgique", "suisse", "luxembourg", "monaco", "canada",
      "québec", "quebec", "états-unis", "etats-unis", "usa", "amérique",
      "allemagne", "italie", "espagne", "royaume-uni", "angleterre", "irlande",
    ],
    customarySteps:
      "Rencontre → fiançailles (demande, parfois bénédiction des familles) → mariage civil (mairie) → mariage religieux (à l'église). Implication des familles plus discrète, consentement individuel central.",
    biblicalFrame:
      "Quitter père et mère pour s'unir (Gn 2.24), alliance publique et engagement devant Dieu et témoins, honorer ses parents (Ex 20.12) en les associant à la démarche.",
    cautions:
      "Individualisme excluant la famille et la communauté de foi ; cohabitation banalisée ; précipitation sans discernement.",
  },
  {
    key: "afrique_ouest",
    label: "Afrique de l'Ouest",
    countries: [
      "côte d'ivoire", "cote d'ivoire", "ivoirien", "sénégal", "senegal",
      "mali", "burkina", "bénin", "benin", "togo", "guinée", "guinee",
      "niger", "ghana", "nigéria", "nigeria", "libéria", "sierra leone",
    ],
    customarySteps:
      "Démarche des familles (« toquage / cogner à la porte », présentation) → dot / mariage coutumier (remise des présents, alliance des deux familles et des clans) → mariage civil → mariage religieux (à l'église). Forte implication des familles élargies et des aînés.",
    biblicalFrame:
      "Honorer les familles et les aînés (Ex 20.12) ; l'alliance qui unit deux familles fait écho à l'alliance biblique ; la dot comprise comme honneur et reconnaissance (et non comme prix d'achat) s'inscrit dans le respect ; bénédiction des parents.",
    cautions:
      "Dot transformée en transaction commerciale ou en surenchère qui empêche le mariage ; rites coutumiers à caractère occulte, ancestral ou idolâtre (libations aux ancêtres, fétiches) ; mariage forcé ou sans le consentement des époux ; polygamie. Ces éléments sortent du cadre biblique.",
  },
  {
    key: "afrique_centrale",
    label: "Afrique centrale",
    countries: [
      "gabon", "cameroun", "congo", "rdc", "congo-kinshasa",
      "congo-brazzaville", "tchad", "centrafrique", "rca",
      "guinée équatoriale", "guinee equatoriale",
    ],
    customarySteps:
      "Présentation et demande officielle entre familles → dot / mariage coutumier (liste de la belle-famille, remise des présents, union des familles) → mariage civil → mariage religieux. Rôle clé des oncles, des aînés et des porte-parole.",
    biblicalFrame:
      "Respect et honneur des familles et des aînés, alliance des familles, consentement mutuel ; bénédiction parentale et communautaire ; engagement public et fidélité.",
    cautions:
      "Dot devenue fardeau financier ou marchandage ; rites ancestraux/occultes ou syncrétisme ; pression familiale niant le consentement des époux ; polygamie.",
  },
  {
    key: "asie",
    label: "Asie",
    countries: [
      "chine", "chinois", "inde", "indien", "vietnam", "philippines",
      "corée", "coree", "japon", "thaïlande", "thailande", "indonésie",
      "indonesie", "cambodge", "laos", "sri lanka", "pakistan", "bangladesh",
    ],
    customarySteps:
      "Très variable selon les pays et les communautés : forte implication des familles, fiançailles parfois présentées ou arrangées, échanges de présents/dot, cérémonies traditionnelles puis civile et religieuse. À préciser au cas par cas.",
    biblicalFrame:
      "Honorer les familles tout en affirmant le consentement libre des deux époux, l'unité du couple (Gn 2.24) et la primauté de la foi en Christ sur les traditions.",
    cautions:
      "Mariage arrangé sans consentement réel ; rites religieux non chrétiens (culte des ancêtres, idoles) ; pression sur la foi du conjoint ; exigences de dot déséquilibrées.",
  },
  {
    key: "lusophone",
    label: "Monde lusophone (Brésil, Portugal, Afrique lusophone)",
    countries: [
      "brésil", "bresil", "brasil", "brésilien", "portugal", "portugais",
      "angola", "mozambique", "moçambique", "cap-vert", "cabo verde",
      "guinée-bissau", "são tomé", "sao tome",
    ],
    customarySteps:
      "Namoro (relation sérieuse) → noivado (fiançailles, parfois bénédiction des familles) → casamento civil → casamento religioso. En Afrique lusophone, des étapes coutumières et la dot (lobolo) peuvent précéder le civil et le religieux.",
    biblicalFrame:
      "Engagement progressif et public, alliance devant Dieu, honneur des familles, fidélité ; le lobolo compris comme honneur (et non comme achat).",
    cautions:
      "Lobolo/dot marchandé ; syncrétisme (pratiques d'esprits / ancêtres) ; cohabitation banalisée sans engagement ; rites occultes.",
  },
  {
    key: "maghreb",
    label: "Maghreb, Afrique du Nord & Moyen-Orient",
    countries: [
      "algérie", "algerie", "algérien", "maroc", "marocain", "tunisie",
      "tunisien", "mauritanie", "libye", "égypte", "egypte", "liban",
      "libanais", "syrie", "jordanie", "irak", "moyen-orient",
      "afrique du nord", "maghreb",
    ],
    customarySteps:
      "Implication forte des familles : demande officielle entre familles (khotba / fiançailles) → dot (mahr) → contrat / mariage civil → mariage religieux. Les communautés chrétiennes y sont souvent minoritaires, parfois discrètes.",
    biblicalFrame:
      "Honneur des familles, consentement libre et mutuel des deux époux (jamais contraint), alliance publique et fidélité ; le mahr/la dot compris comme honneur et non comme prix d'achat.",
    cautions:
      "Mariage arrangé ou forcé ; pression religieuse ou communautaire sur la foi du croyant (contexte majoritairement non chrétien) ; dot/mahr marchandé ; union imposée dans le secret. Le discernement protège la liberté de conscience et de foi.",
  },
];

/** Résout un pays/texte libre vers une région connue (ou null). */
export function resolveRegion(country?: string | null): CultureRegion | null {
  if (!country) return null;
  const c = country.trim().toLowerCase();
  if (c.length < 3) return null;
  // On retient le token le PLUS LONG present dans la saisie : un pays specifique
  // (« guinee equatoriale », « guinee-bissau ») l'emporte ainsi sur un token plus
  // court d'une autre region (« guinee »), evitant les collisions de sous-chaines.
  let best: CultureRegion | null = null;
  let bestLen = 0;
  for (const r of CULTURE_REGIONS) {
    for (const token of r.countries) {
      if (token.length > bestLen && c.includes(token)) {
        best = r;
        bestLen = token.length;
      }
    }
  }
  return best;
}

/** Référence compacte de toutes les régions (pour le prompt système). */
export function culturalReference(): string {
  return CULTURE_REGIONS.map(
    (r) =>
      `• ${r.label} :\n  - Trajectoire coutumière : ${r.customarySteps}\n  - Cadre biblique : ${r.biblicalFrame}\n  - À discerner / éviter : ${r.cautions}`,
  ).join("\n");
}

/**
 * Bloc d'instructions culturelles pour le prompt système.
 * Si le pays est connu, cible la région ; sinon fournit toute la référence
 * et demande à l'agent d'interroger la personne.
 */
export function culturalGuidance(country?: string | null): string {
  const intro = `DIMENSION CULTURELLE & COUTUMIÈRE (toujours dans le cadre biblique et théologique) :
Tu connais les trajectoires coutumières du mariage selon les régions. Dans un même pays cohabitent plusieurs ethnies : ne présume jamais — DEMANDE à la personne son pays ET son ethnie / sa communauté, puis aide-la à discerner quelles étapes coutumières sont compatibles avec l'Écriture et lesquelles n'en relèvent pas (syncrétisme, rites occultes ou ancestraux, mariage forcé, dot marchandée, polygamie). Tu honores la culture sans jamais la placer au-dessus de la Parole de Dieu.`;
  const region = resolveRegion(country);
  if (region) {
    return `${intro}
Contexte probable de la personne (${region.label}) :
- Trajectoire coutumière : ${region.customarySteps}
- Cadre biblique : ${region.biblicalFrame}
- À discerner / éviter : ${region.cautions}
Confirme néanmoins son pays et son ethnie avant de conseiller.`;
  }
  return `${intro}
Référence par région :
${culturalReference()}`;
}
