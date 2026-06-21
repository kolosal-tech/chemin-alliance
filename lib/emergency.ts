import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import type { Locale } from "@/lib/core-engine";

// Ressources d'urgence localisées (numéros par pays). Chargées depuis
// rulesets/emergency-resources.yaml. Sert le garde-fou DANGER (Gardien) et la
// redirection du Coach IA : orienter vers des relais CONCRETS et locaux.

type CountryEntry = { general?: string; violence?: string; child?: string };
type EmergencyData = {
  default: Record<string, string>;
  countries: Record<string, CountryEntry>;
};

let cache: EmergencyData | null = null;
function load(): EmergencyData {
  if (cache) return cache;
  const raw = readFileSync(
    join(process.cwd(), "rulesets", "emergency-resources.yaml"),
    "utf8",
  );
  cache = parse(raw) as EmergencyData;
  return cache;
}

// Pays (texte libre saisi par l'utilisateur) -> code ISO connu.
const NAME_TO_ISO: Array<[RegExp, string]> = [
  [/france|français|francais/i, "FR"],
  [/belgique|belge/i, "BE"],
  [/suisse/i, "CH"],
  [/c[oô]te d'?ivoire|ivoir/i, "CI"],
  [/s[ée]n[ée]gal/i, "SN"],
  [/cameroun/i, "CM"],
  [/congo|rdc|kinshasa/i, "CD"],
  [/b[ée]nin/i, "BJ"],
  [/togo/i, "TG"],
  [/\bmali\b|malien/i, "ML"],
  [/burkina/i, "BF"],
  [/gabon/i, "GA"],
  [/br[ée]sil|brasil/i, "BR"],
  [/portugal|portugais/i, "PT"],
  [/canada|qu[ée]bec/i, "CA"],
  [/[ée]tats-unis|etats-unis|usa|united states/i, "US"],
];

export function resolveCountryCode(country?: string | null): string | null {
  if (!country) return null;
  for (const [re, code] of NAME_TO_ISO) if (re.test(country)) return code;
  return null;
}

/**
 * Ligne de ressources d'urgence pour un pays (texte libre) et une langue.
 * Renvoie les relais locaux connus suivis du message de repli, sinon le repli
 * international seul.
 */
export function emergencyLine(
  country?: string | null,
  locale: Locale = "fr",
): string {
  const data = load();
  const fallback = data.default?.[locale] ?? data.default?.fr ?? "";
  const code = resolveCountryCode(country);
  const entry = code ? data.countries?.[code] : undefined;
  if (!entry) return fallback;
  const parts = [entry.general, entry.violence, entry.child].filter(Boolean);
  return parts.length ? `${parts.join(" · ")} - ${fallback}` : fallback;
}
