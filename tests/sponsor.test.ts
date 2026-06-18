import { describe, it, expect } from "vitest";
import {
  SPONSOR_RELATIONS,
  isSponsorRelation,
  generateBlessingToken,
  statusForDecision,
} from "@/lib/sponsor";

describe("sponsor — helpers parrain/marraine", () => {
  it("relations valides reconnues, invalides rejetées", () => {
    for (const r of SPONSOR_RELATIONS) expect(isSponsorRelation(r)).toBe(true);
    for (const r of ["spouse", "", "FAMILY", "boss"]) {
      expect(isSponsorRelation(r)).toBe(false);
    }
  });

  it("token magique : base64url, ≥40 chars, non devinable", () => {
    const a = generateBlessingToken();
    const b = generateBlessingToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(a.length).toBeGreaterThanOrEqual(40);
    expect(a).not.toBe(b);
  });

  it("décision -> statut de bénédiction", () => {
    expect(statusForDecision("bless")).toBe("BLESSED");
    expect(statusForDecision("caution")).toBe("CAUTION");
  });
});
