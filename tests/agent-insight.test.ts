import { describe, it, expect } from "vitest";
import {
  AgentInsightIntegrityError,
  isLegacyInsightValue,
  sealInsight,
  openInsight,
  openInsightStrict,
} from "@/lib/agent-insight";

describe("agent-insight - chiffrement de dataJson", () => {
  it("round-trip : openInsight(sealInsight(x)) restitue l'objet", () => {
    const data = {
      severity: "high",
      signals: ["loterie", "crypto"],
      excerpt: "gagné 5000€",
    };
    const sealed = sealInsight(data);
    expect(openInsight(sealed)).toEqual(data);
  });

  it("sealInsight chiffre : le résultat est une chaîne sans le texte clair", () => {
    const sealed = sealInsight({ excerpt: "héritage nigérian" });
    expect(typeof sealed).toBe("string");
    expect(sealed).not.toContain("héritage");
    expect(sealed).not.toContain("nigérian");
  });

  it("chiffre et restitue un bilan de maturité utilisé par le matching", () => {
    const maturity = {
      total: 18,
      level: "preparing",
      strengths: ["communication"],
      growth: ["vision"],
      suggestsPreparation: true,
    };
    const sealed = sealInsight(maturity);

    expect(sealed).not.toContain("communication");
    expect(openInsight(sealed)).toEqual(maturity);
  });

  it("compat rétro : un objet legacy en clair est renvoyé tel quel", () => {
    const legacy = {
      severity: "medium",
      summary: "ancien insight non chiffré",
    };
    expect(openInsight(legacy)).toEqual(legacy);
  });

  it("openInsight tolère null / undefined", () => {
    expect(openInsight(null)).toBeNull();
    expect(openInsight(undefined)).toBeNull();
  });

  it("distingue les objets legacy du ciphertext", () => {
    expect(isLegacyInsightValue({ private: true })).toBe(true);
    expect(isLegacyInsightValue(["legacy"])).toBe(true);
    expect(isLegacyInsightValue(sealInsight({ private: true }))).toBe(false);
    expect(isLegacyInsightValue(null)).toBe(false);
  });

  it("openInsight renvoie null sur une chaîne corrompue", () => {
    expect(openInsight("pas.un.chiffré.valide")).toBeNull();
  });

  it("la lecture stricte échoue fermée sur un ciphertext corrompu", () => {
    expect(() => openInsightStrict("pas.un.chiffré.valide")).toThrow(
      AgentInsightIntegrityError,
    );
  });

  it("la lecture stricte conserve le support des données legacy", () => {
    const legacy = { severity: "high", signals: ["money_request"] };
    expect(openInsightStrict(legacy)).toEqual(legacy);
  });
});
