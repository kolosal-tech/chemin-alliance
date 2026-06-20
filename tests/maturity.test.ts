import { describe, it, expect } from "vitest";
import { scoreMaturity, MATURITY_AXES } from "@/lib/maturity";

const all = (w: number) => Object.fromEntries(MATURITY_AXES.map((a) => [a, w]));

describe("scoreMaturity — bilan de maturité (logique pure)", () => {
  it("aucune réponse : total 0, niveau growing, tout en croissance", () => {
    const r = scoreMaturity({});
    expect(r.total).toBe(0);
    expect(r.level).toBe("growing");
    expect(r.growth).toEqual(MATURITY_AXES);
    expect(r.strengths).toEqual([]);
    expect(r.suggestsPreparation).toBe(true);
  });

  it("toutes au max : total 100, niveau ready, aucune croissance", () => {
    const r = scoreMaturity(all(3));
    expect(r.total).toBe(100);
    expect(r.level).toBe("ready");
    expect(r.strengths).toEqual(MATURITY_AXES);
    expect(r.growth).toEqual([]);
    expect(r.suggestsPreparation).toBe(false);
  });

  it("bornes des bandes : 33 growing, 67 ready", () => {
    const r = scoreMaturity(all(1)); // 6/18 = 33 → growing borne basse
    expect(r.total).toBe(33);
    expect(r.level).toBe("growing");
    const r2 = scoreMaturity(all(2)); // 12/18 = 67 → ready borne basse
    expect(r2.total).toBe(67);
    expect(r2.level).toBe("ready");
  });

  it("bande preparing entre 34 et 66", () => {
    // 3 axes à 3, 3 axes à 0 = 9/18 = 50
    const mixed = { motivation: 3, past: 3, faith: 3 };
    const r = scoreMaturity(mixed);
    expect(r.total).toBe(50);
    expect(r.level).toBe("preparing");
    expect(r.strengths).toEqual(["motivation", "past", "faith"]);
    expect(r.growth).toEqual(["stability", "vision", "availability"]);
  });

  it("clamp les poids hors borne et NaN", () => {
    const r = scoreMaturity({
      motivation: 9,
      past: -4,
      faith: Number.NaN,
      stability: 2.6,
    });
    expect(r.perAxis.motivation).toBe(3);
    expect(r.perAxis.past).toBe(0);
    expect(r.perAxis.faith).toBe(0);
    expect(r.perAxis.stability).toBe(3); // 2.6 arrondi
  });

  it("perAxis contient toujours les 6 axes", () => {
    const r = scoreMaturity({ motivation: 2 });
    expect(Object.keys(r.perAxis).sort()).toEqual([...MATURITY_AXES].sort());
  });

  it("ready avec un axe faible : reste invité à se préparer", () => {
    // 5 axes à 3, 1 axe à 0 = 15/18 = 83 → ready mais growth non vide
    const r = scoreMaturity({
      motivation: 3,
      past: 3,
      faith: 3,
      stability: 3,
      vision: 3,
      availability: 0,
    });
    expect(r.level).toBe("ready");
    expect(r.growth).toEqual(["availability"]);
    expect(r.suggestsPreparation).toBe(true);
  });
});
