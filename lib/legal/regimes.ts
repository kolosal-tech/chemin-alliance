import type { Locale } from "@/lib/core-engine";
import regimeContent from "./regimes.content.json";

/**
 * Régimes réglementaires de confidentialité par bloc de pays. La Politique de
 * confidentialité de base (lib/legal/content.ts) est la version UE/RGPD ; pour
 * les autres blocs, on remplace trois sections (base légale §2, destinataires &
 * transferts §6, vos droits §8) par une rédaction adaptée au droit local.
 *
 * Détection : ?region= explicite > en-tête géo Vercel (x-vercel-ip-country) >
 * UE par défaut (responsable de traitement établi en UE).
 *
 * AVERTISSEMENT : rédaction de première main, à faire valider juridiquement
 * (surtout US/CCPA). Aucune affirmation ne dépasse les faits réels du produit.
 */
export type Regime = "eu" | "us" | "ca" | "br" | "intl";

type Section = { h: string; p: string[] };
type RegimeSections = {
  legalBasis: Record<Locale, Section>;
  recipients: Record<Locale, Section>;
  rights: Record<Locale, Section>;
};

const CONTENT = regimeContent as Record<
  Exclude<Regime, "eu">,
  RegimeSections
>;

/** Codes ISO 3166-1 alpha-2 → bloc. Tout le reste retombe sur "intl". */
const REGIME_BY_ISO: Record<string, Regime> = {
  US: "us",
  CA: "ca",
  BR: "br",
  // UE / EEE / Royaume-Uni / Suisse / Monaco → RGPD ou équivalent strict
  AT: "eu", BE: "eu", BG: "eu", HR: "eu", CY: "eu", CZ: "eu", DK: "eu",
  EE: "eu", FI: "eu", FR: "eu", DE: "eu", GR: "eu", HU: "eu", IE: "eu",
  IT: "eu", LV: "eu", LT: "eu", LU: "eu", MT: "eu", NL: "eu", PL: "eu",
  PT: "eu", RO: "eu", SK: "eu", SI: "eu", ES: "eu", SE: "eu",
  IS: "eu", LI: "eu", NO: "eu", GB: "eu", CH: "eu", MC: "eu",
};

/** Ordre d'affichage du sélecteur de région. */
export const REGIME_ORDER: Regime[] = ["eu", "us", "ca", "br", "intl"];

export const REGIME_LABELS: Record<Regime, Record<Locale, string>> = {
  eu: {
    fr: "Union européenne / Royaume-Uni (RGPD)",
    en: "European Union / United Kingdom (GDPR)",
    es: "Unión Europea / Reino Unido (RGPD)",
    pt: "União Europeia / Reino Unido (RGPD)",
  },
  us: {
    fr: "États-Unis (CCPA / CPRA)",
    en: "United States (CCPA / CPRA)",
    es: "Estados Unidos (CCPA / CPRA)",
    pt: "Estados Unidos (CCPA / CPRA)",
  },
  ca: {
    fr: "Canada (LPRPDE / Loi 25)",
    en: "Canada (PIPEDA / Law 25)",
    es: "Canadá (PIPEDA / Ley 25)",
    pt: "Canadá (PIPEDA / Lei 25)",
  },
  br: {
    fr: "Brésil (LGPD)",
    en: "Brazil (LGPD)",
    es: "Brasil (LGPD)",
    pt: "Brasil (LGPD)",
  },
  intl: {
    fr: "International (autres pays)",
    en: "International (other countries)",
    es: "Internacional (otros países)",
    pt: "Internacional (outros países)",
  },
};

/** Bloc à partir d'un code pays ISO (en-tête géo). Défaut : UE. */
export function regimeFromIso(iso?: string | null): Regime {
  if (!iso) return "eu";
  return REGIME_BY_ISO[iso.trim().toUpperCase()] ?? "intl";
}

/** Valide un paramètre ?region= ; null si invalide. */
export function asRegime(value?: string | null): Regime | null {
  return value && REGIME_ORDER.includes(value as Regime)
    ? (value as Regime)
    : null;
}

/**
 * Sections spécifiques au bloc pour la locale courante, ou null pour l'UE
 * (la base content.ts EST la version UE/RGPD). Clés = numéro de section à
 * remplacer dans la politique de base.
 */
export function regimeOverrides(
  regime: Regime,
  locale: Locale,
): { "2": Section; "6": Section; "8": Section } | null {
  if (regime === "eu") return null;
  const c = CONTENT[regime];
  return {
    "2": c.legalBasis[locale],
    "6": c.recipients[locale],
    "8": c.rights[locale],
  };
}
