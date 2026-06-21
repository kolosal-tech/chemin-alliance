import { describe, it, expect } from "vitest";
import fr from "../messages/fr.json";
import en from "../messages/en.json";
import es from "../messages/es.json";
import pt from "../messages/pt.json";

// Garde de parite i18n : fr.json est la reference. Tout ajout de cle dans une
// langue sans report dans les autres (parcours d'alliance, CRM/admin, alertes
// Watchman/antiScam, ou n'importe quel namespace) casse ce test AVANT le deploy.
// Etat verifie le 2026-06-21 : 928 cles, 4 langues, 0 ecart.

type Json = Record<string, unknown>;
const TARGETS = { en, es, pt } as const;

function flatten(obj: Json, prefix = "", out: Record<string, string> = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      flatten(v as Json, key, out);
    } else {
      out[key] = String(v);
    }
  }
  return out;
}

const ref = flatten(fr as Json);
const refKeys = Object.keys(ref);

describe("i18n — parite des catalogues (fr = reference)", () => {
  it("fr.json contient au moins 900 cles (garde anti-regression)", () => {
    expect(refKeys.length).toBeGreaterThanOrEqual(900);
  });

  for (const [code, cat] of Object.entries(TARGETS)) {
    const keys = flatten(cat as Json);

    it(`[${code}] ne manque aucune cle presente en FR`, () => {
      const missing = refKeys.filter((k) => !(k in keys));
      expect(
        missing,
        `Cles manquantes en ${code}: ${missing.join(", ")}`,
      ).toEqual([]);
    });

    it(`[${code}] n'a pas de cle orpheline absente de FR`, () => {
      const extra = Object.keys(keys).filter((k) => !(k in ref));
      expect(extra, `Cles orphelines en ${code}: ${extra.join(", ")}`).toEqual(
        [],
      );
    });

    it(`[${code}] ne laisse aucune valeur vide`, () => {
      const empty = Object.entries(keys)
        .filter(([, v]) => v.trim() === "")
        .map(([k]) => k);
      expect(empty, `Valeurs vides en ${code}: ${empty.join(", ")}`).toEqual(
        [],
      );
    });
  }
});
