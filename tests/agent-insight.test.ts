import { describe, it, expect } from "vitest";
import { sealInsight, openInsight } from "@/lib/agent-insight";

describe("agent-insight — chiffrement de dataJson", () => {
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

  it("openInsight renvoie null sur une chaîne corrompue", () => {
    expect(openInsight("pas.un.chiffré.valide")).toBeNull();
  });
});
