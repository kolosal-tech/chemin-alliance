import { describe, it, expect } from "vitest";
import {
  parseFilters,
  matchesFilters,
  applyFilters,
  activeFilterCount,
  type FilterableProfile,
} from "@/lib/filters";

const p = (age: number, isVerified = false): FilterableProfile => ({
  age,
  isVerified,
});

describe("lib/filters - parseFilters (Zod défensif)", () => {
  it("parse des valeurs valides", () => {
    expect(
      parseFilters({
        ageMin: "25",
        ageMax: "40",
        verified: "1",
      }),
    ).toEqual({ ageMin: 25, ageMax: 40, verified: "1" });
  });

  it("ignore les valeurs hors-bornes (catch → undefined)", () => {
    const f = parseFilters({ ageMin: "5", ageMax: "200" });
    expect(f.ageMin).toBeUndefined();
    expect(f.ageMax).toBeUndefined();
  });

  it("ignore les valeurs non numériques", () => {
    expect(parseFilters({ ageMin: "abc" }).ageMin).toBeUndefined();
  });

  it('verified n\'est retenu que pour la valeur "1"', () => {
    expect(parseFilters({ verified: "true" }).verified).toBeUndefined();
    expect(parseFilters({ verified: "1" }).verified).toBe("1");
  });

  it("searchParams vide / undefined → filtres vides", () => {
    expect(parseFilters(undefined)).toEqual({});
    expect(parseFilters({})).toEqual({});
  });

  it("ignore les clés inconnues (cat, page…)", () => {
    expect(parseFilters({ cat: "x", page: "2", ageMin: "30" })).toEqual({
      ageMin: 30,
    });
  });
});

describe("lib/filters - matchesFilters", () => {
  it("borne d'âge min/max", () => {
    expect(matchesFilters(p(20), { ageMin: 25 })).toBe(false);
    expect(matchesFilters(p(30), { ageMin: 25, ageMax: 40 })).toBe(true);
    expect(matchesFilters(p(45), { ageMax: 40 })).toBe(false);
  });

  it("vérifiés uniquement", () => {
    expect(matchesFilters(p(30, false), { verified: "1" })).toBe(false);
    expect(matchesFilters(p(30, true), { verified: "1" })).toBe(true);
  });

  it("filtres vides ⇒ tout passe", () => {
    expect(matchesFilters(p(99, false), {})).toBe(true);
  });
});

describe("lib/filters - applyFilters & activeFilterCount", () => {
  it("applyFilters filtre la liste", () => {
    const list = [p(22, true), p(35, false), p(40, true)];
    const out = applyFilters(list, { ageMin: 30, verified: "1" });
    expect(out).toEqual([p(40, true)]);
  });

  it("activeFilterCount compte les filtres posés", () => {
    expect(activeFilterCount({})).toBe(0);
    expect(
      activeFilterCount({
        ageMin: 25,
        ageMax: 40,
        verified: "1",
      }),
    ).toBe(3);
    expect(activeFilterCount({ ageMin: 25 })).toBe(1);
  });
});
