import { describe, it, expect } from "vitest";
import { generateCode, hashCode } from "@/lib/sms";

describe("sms - code de vérification", () => {
  it("generateCode renvoie 6 chiffres", () => {
    for (let i = 0; i < 50; i++) {
      expect(generateCode()).toMatch(/^\d{6}$/);
    }
  });

  it("hashCode est déterministe et ne renvoie pas le code en clair", () => {
    const h1 = hashCode("123456");
    const h2 = hashCode("123456");
    expect(h1).toBe(h2);
    expect(h1).not.toContain("123456");
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
  });

  it("hashCode diffère selon le code", () => {
    expect(hashCode("000000")).not.toBe(hashCode("000001"));
  });
});
