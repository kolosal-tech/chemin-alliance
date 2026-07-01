import { describe, it, expect } from "vitest";
import fr from "../messages/fr.json";
import en from "../messages/en.json";
import es from "../messages/es.json";
import pt from "../messages/pt.json";
import { QUESTION_COUNT } from "@/lib/games/questions";

// Garde de parite i18n pour le namespace couple_game (jeu de couple/match,
// construction C, hybride, SANS FIN - lot L3). fr.json est la reference.
// Verifie : parite stricte des cles entre les 4 langues, presence exacte de
// QUESTION_COUNT questions curatees, et absence de valeur vide.

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

const frDoc = fr as Json;
const refGame = flatten((frDoc.couple_game ?? {}) as Json);
const refKeys = Object.keys(refGame);

describe("couple_game i18n - parite des catalogues (fr = reference)", () => {
  it("fr.json contient bien un namespace couple_game", () => {
    expect(frDoc.couple_game).toBeTruthy();
  });

  it(`couple_game.questions contient exactement QUESTION_COUNT (${QUESTION_COUNT}) cles`, () => {
    const questions = (frDoc.couple_game as Json).questions as Json;
    expect(Object.keys(questions).length).toBe(QUESTION_COUNT);
    for (let i = 1; i <= QUESTION_COUNT; i += 1) {
      expect(questions).toHaveProperty(`q${i}`);
    }
  });

  for (const [code, cat] of Object.entries(TARGETS)) {
    const doc = cat as Json;
    const keys = flatten((doc.couple_game ?? {}) as Json);

    it(`[${code}] a bien un namespace couple_game`, () => {
      expect(doc.couple_game).toBeTruthy();
    });

    it(`[${code}] ne manque aucune cle couple_game presente en FR`, () => {
      const missing = refKeys.filter((k) => !(k in keys));
      expect(
        missing,
        `Cles manquantes en ${code}: ${missing.join(", ")}`,
      ).toEqual([]);
    });

    it(`[${code}] n'a pas de cle couple_game orpheline absente de FR`, () => {
      const extra = Object.keys(keys).filter((k) => !(k in refGame));
      expect(extra, `Cles orphelines en ${code}: ${extra.join(", ")}`).toEqual(
        [],
      );
    });

    it(`[${code}] ne laisse aucune valeur couple_game vide`, () => {
      const empty = Object.entries(keys)
        .filter(([, v]) => v.trim() === "")
        .map(([k]) => k);
      expect(empty, `Valeurs vides en ${code}: ${empty.join(", ")}`).toEqual(
        [],
      );
    });
  }
});
