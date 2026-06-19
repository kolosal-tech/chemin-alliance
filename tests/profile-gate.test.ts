import { describe, it, expect } from "vitest";
import { missingMinimumProfile } from "@/lib/matching";

// Profil minimum pour entrer dans le matching : ville (cityApprox) + phrase
// d'intention (relationshipProfile.intentionStatement). Helper pur.
describe("missingMinimumProfile", () => {
  it("renvoie [] quand ville + intention sont renseignées", () => {
    expect(
      missingMinimumProfile({
        cityApprox: "Lyon",
        relationshipProfile: { intentionStatement: "Avancer avec vérité." },
      }),
    ).toEqual([]);
  });

  it("signale la ville manquante (null)", () => {
    expect(
      missingMinimumProfile({
        cityApprox: null,
        relationshipProfile: { intentionStatement: "Un projet clair." },
      }),
    ).toEqual(["city"]);
  });

  it("signale l'intention manquante (null)", () => {
    expect(
      missingMinimumProfile({
        cityApprox: "Marseille",
        relationshipProfile: { intentionStatement: null },
      }),
    ).toEqual(["intention"]);
  });

  it("signale l'intention manquante quand relationshipProfile est null", () => {
    expect(
      missingMinimumProfile({
        cityApprox: "Genève",
        relationshipProfile: null,
      }),
    ).toEqual(["intention"]);
  });

  it("signale les deux quand tout manque", () => {
    expect(
      missingMinimumProfile({
        cityApprox: null,
        relationshipProfile: null,
      }),
    ).toEqual(["city", "intention"]);
  });

  it("traite les chaînes vides ou blanches comme manquantes", () => {
    expect(
      missingMinimumProfile({
        cityApprox: "   ",
        relationshipProfile: { intentionStatement: "" },
      }),
    ).toEqual(["city", "intention"]);
  });
});
