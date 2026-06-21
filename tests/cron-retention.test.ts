import { describe, it, expect } from "vitest";
import {
  buildPurgePlan,
  usersDueForDailyDevotion,
  chunk,
} from "@/lib/cron/retention";

const day = (s: string) => new Date(s + "T12:00:00Z"); // midi UTC

describe("retention - logique pure", () => {
  it("buildPurgePlan : bornes déterministes (tokens=now, aiCoach=now-90j)", () => {
    const now = day("2026-06-18");
    const p = buildPurgePlan(now);
    expect(p.phoneBefore.getTime()).toBe(now.getTime());
    expect(p.tokenBefore.getTime()).toBe(now.getTime());
    expect(p.aiCoachBefore.getTime()).toBe(
      now.getTime() - 90 * 24 * 60 * 60 * 1000,
    );
  });

  it("usersDueForDailyDevotion : dédoublonne, ordre stable", () => {
    expect(usersDueForDailyDevotion(["a", "b", "a", "c", "b"])).toEqual([
      "a",
      "b",
      "c",
    ]);
    expect(usersDueForDailyDevotion([])).toEqual([]);
  });

  it("chunk : lots corrects, dernier partiel, bords", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([1, 2], 5)).toEqual([[1, 2]]);
    expect(chunk([], 3)).toEqual([]);
  });
});
