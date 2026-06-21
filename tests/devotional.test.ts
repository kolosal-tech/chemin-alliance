import { describe, it, expect } from "vitest";
import { advanceStreak } from "@/lib/devotional";

const day = (s: string) => new Date(s + "T12:00:00Z"); // midi UTC

describe("advanceStreak - logique de streak quotidien (jour UTC)", () => {
  it("première fois : streak = 1", () => {
    const r = advanceStreak(null, day("2026-06-17"), 0, 0);
    expect(r.currentStreak).toBe(1);
    expect(r.longestStreak).toBe(1);
    expect(r.alreadyDoneToday).toBe(false);
  });

  it("jour consécutif (hier) : +1", () => {
    const r = advanceStreak(day("2026-06-16"), day("2026-06-17"), 3, 5);
    expect(r.currentStreak).toBe(4);
    expect(r.longestStreak).toBe(5);
    expect(r.alreadyDoneToday).toBe(false);
  });

  it("nouveau record quand current dépasse longest", () => {
    const r = advanceStreak(day("2026-06-16"), day("2026-06-17"), 5, 5);
    expect(r.currentStreak).toBe(6);
    expect(r.longestStreak).toBe(6);
    expect(r.isNewRecord).toBe(true);
  });

  it("jour manqué (gap ≥ 2j) : reset à 1, longest conservé", () => {
    const r = advanceStreak(day("2026-06-14"), day("2026-06-17"), 9, 12);
    expect(r.currentStreak).toBe(1);
    expect(r.longestStreak).toBe(12);
  });

  it("déjà fait aujourd'hui : idempotent, aucun changement", () => {
    const r = advanceStreak(day("2026-06-17"), day("2026-06-17"), 4, 7);
    expect(r.alreadyDoneToday).toBe(true);
    expect(r.currentStreak).toBe(4);
    expect(r.longestStreak).toBe(7);
  });

  it("compare par JOUR UTC, pas par heure (23:55 puis 00:05 = 2 jours)", () => {
    const late = new Date("2026-06-16T23:55:00Z");
    const early = new Date("2026-06-17T00:05:00Z");
    const r = advanceStreak(late, early, 2, 2);
    expect(r.currentStreak).toBe(3);
  });
});

import { getDailyDevotion } from "@/lib/devotional";

describe("getDailyDevotion - sélection déterministe par jour", () => {
  it("1er janvier → premier dévotionnel (jour 0, pas off-by-one)", () => {
    const d = getDailyDevotion("fr", new Date("2026-01-01T12:00:00Z"));
    expect(d.id).toBe("amour-patient");
  });

  it("déterministe et localisé (même jour, locales différentes = même id)", () => {
    const fr = getDailyDevotion("fr", new Date("2026-03-15T08:00:00Z"));
    const en = getDailyDevotion("en", new Date("2026-03-15T20:00:00Z"));
    expect(fr.id).toBe(en.id);
    expect(fr.verse).not.toBe(en.verse);
  });
});
