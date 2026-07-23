import { describe, it, expect } from "vitest";
import {
  BLESSING_TOKEN_TTL_MS,
  SPONSOR_RELATIONS,
  blessingTokenExpiresAt,
  hashBlessingToken,
  isBlessingToken,
  isSponsorRelation,
  generateBlessingToken,
  statusForDecision,
} from "@/lib/sponsor";

describe("sponsor - helpers parrain/marraine", () => {
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
    expect(a).toHaveLength(43);
    expect(a).not.toBe(b);
    expect(isBlessingToken(a)).toBe(true);
    expect(isBlessingToken(`${a}x`)).toBe(false);
    expect(isBlessingToken("not-a-256-bit-token")).toBe(false);
  });

  it("ne produit qu'une empreinte SHA-256 persistable et un TTL de 72 h", () => {
    expect(hashBlessingToken("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
    expect(hashBlessingToken("abc")).toHaveLength(64);

    const now = new Date("2026-07-23T10:00:00.000Z");
    expect(blessingTokenExpiresAt(now).getTime() - now.getTime()).toBe(
      BLESSING_TOKEN_TTL_MS,
    );
    expect(BLESSING_TOKEN_TTL_MS).toBe(72 * 60 * 60 * 1000);
  });

  it("décision -> statut de bénédiction", () => {
    expect(statusForDecision("bless")).toBe("BLESSED");
    expect(statusForDecision("caution")).toBe("CAUTION");
  });
});
