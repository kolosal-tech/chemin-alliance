/**
 * Constantes partagees Alliance Lab : cles de questions (i18n) + mapping
 * pays -> region continentale pour la geo-conscience du Pasteur IA.
 */
export const DISC_KEYS = [
  "disc.q1",
  "disc.q2",
  "disc.q3",
  "disc.q4",
  "disc.q5",
] as const;

export const DEEP_KEYS = [
  "deep.q1",
  "deep.q2",
  "deep.q3",
  "deep.q4",
  "deep.q5",
] as const;

export const DISC_CODES = ["D", "I", "S", "C"] as const;
export type DiscCode = (typeof DISC_CODES)[number];

// Mapping minimal pays -> region (Vague 1). Etendu au besoin.
const COUNTRY_TO_REGION: Record<string, string> = {
  CI: "west-africa",
  BF: "west-africa",
  SN: "west-africa",
  ML: "west-africa",
  TG: "west-africa",
  BJ: "west-africa",
  GH: "west-africa",
  NG: "west-africa",
  GN: "west-africa",
  FR: "europe",
  BE: "europe",
  CH: "europe",
  DE: "europe",
  ES: "europe",
  PT: "europe",
  IT: "europe",
  GB: "europe",
  NL: "europe",
  CO: "latam",
  BR: "latam",
  MX: "latam",
  AR: "latam",
  PE: "latam",
  CL: "latam",
  VE: "latam",
  US: "north-america",
  CA: "north-america",
};

/** Region continentale captee depuis l'en-tete IP Vercel (null si inconnue). */
export function regionFromRequest(req: Request): string | null {
  const c = req.headers.get("x-vercel-ip-country");
  return c ? (COUNTRY_TO_REGION[c.toUpperCase()] ?? null) : null;
}
