import { describe, it, expect } from "vitest";
import { scoreDisc } from "@/lib/services/alliance-game-service";

describe("scoreDisc - décompte DISC pur", () => {
  it("aucun code -> tous les compteurs à 0, dominant null", () => {
    expect(scoreDisc([])).toEqual({ D: 0, I: 0, S: 0, C: 0, dominant: null });
  });

  it("un seul type -> ce type est dominant", () => {
    expect(scoreDisc(["D"])).toEqual({ D: 1, I: 0, S: 0, C: 0, dominant: "D" });
    expect(scoreDisc(["I", "I", "I"])).toEqual({
      D: 0,
      I: 3,
      S: 0,
      C: 0,
      dominant: "I",
    });
  });

  it("majorité claire -> dominant = le plus fréquent", () => {
    expect(scoreDisc(["D", "D", "I", "S"])).toEqual({
      D: 2,
      I: 1,
      S: 1,
      C: 0,
      dominant: "D",
    });
  });

  it("égalité entre deux types -> dominant = le premier trouvé dans l'ordre D,I,S,C", () => {
    expect(scoreDisc(["S", "D"])).toEqual({
      D: 1,
      I: 0,
      S: 1,
      C: 0,
      dominant: "D",
    });
    expect(scoreDisc(["C", "I"])).toEqual({
      D: 0,
      I: 1,
      S: 0,
      C: 1,
      dominant: "I",
    });
  });

  it("égalité parfaite entre les 4 types -> dominant = D (premier de la table)", () => {
    expect(scoreDisc(["D", "I", "S", "C"])).toEqual({
      D: 1,
      I: 1,
      S: 1,
      C: 1,
      dominant: "D",
    });
  });

  it("beaucoup de codes -> tally correct sans effet de bord sur l'ordre d'entrée", () => {
    const codes: Array<"D" | "I" | "S" | "C"> = [
      "S",
      "S",
      "C",
      "D",
      "S",
      "I",
      "S",
    ];
    expect(scoreDisc(codes)).toEqual({
      D: 1,
      I: 1,
      S: 4,
      C: 1,
      dominant: "S",
    });
  });
});
