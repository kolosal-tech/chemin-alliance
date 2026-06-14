import { describe, it, expect } from "vitest";
import { analyzeRisk, type RiskSignal } from "@/lib/agents/watchman";

function signalsOf(text: string): RiskSignal[] {
  return analyzeRisk(text).signals;
}

describe("Veilleur 2.0 — détection d'arnaque sentimentale", () => {
  it("détecte les nouveaux tropes d'arnaque", () => {
    expect(signalsOf("J'ai gagné un gros lot, on partage l'héritage")).toContain(
      "inheritance_lottery",
    );
    expect(
      signalsOf("Envoie une carte cadeau Google Play ou du bitcoin"),
    ).toContain("gift_card_crypto");
    expect(
      signalsOf("Je suis un soldat américain déployé en mission"),
    ).toContain("fake_identity");
    expect(
      signalsOf("Passe-moi ton whatsapp, on continue sur Telegram"),
    ).toContain("off_platform_push");
    expect(
      signalsOf("Je suis bloqué à la douane, j'ai des frais médicaux urgents"),
    ).toContain("sob_story");
  });

  it("conserve les signaux historiques", () => {
    expect(signalsOf("envoie-moi de l'argent en urgence")).toContain(
      "money_request",
    );
    expect(signalsOf("Dieu m'a dit que tu es ma femme")).toContain(
      "spiritual_manipulation",
    );
  });

  it("sévérité : argent/arnaque = high", () => {
    expect(analyzeRisk("achète-moi une gift card itunes").severity).toBe("high");
    expect(analyzeRisk("on partage la loterie").severity).toBe("high");
  });

  it("sévérité : pression/trope seul = medium", () => {
    expect(analyzeRisk("ajoute-moi sur whatsapp").severity).toBe("medium");
  });

  it("plusieurs signaux -> sévérité maximale (high)", () => {
    const r = analyzeRisk(
      "Je suis militaire en mission, envoie-moi de l'argent urgent",
    );
    expect(r.signals.length).toBeGreaterThanOrEqual(2);
    expect(r.severity).toBe("high");
  });

  it("message bénin -> non signalé, severity none", () => {
    const r = analyzeRisk(
      "J'ai aimé notre échange sur la prière, à bientôt à l'église",
    );
    expect(r.flagged).toBe(false);
    expect(r.severity).toBe("none");
  });
});
