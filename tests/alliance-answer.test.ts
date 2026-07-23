import { describe, expect, it } from "vitest";
import {
  openAllianceAnswer,
  sealAllianceAnswer,
  toReadableAllianceAnswer,
} from "@/lib/alliance-answer";

describe("chiffrement des réponses Alliance", () => {
  it("ne persiste jamais la réponse en clair dans une nouvelle écriture", () => {
    const plaintext = "Une réponse intime sur ma foi et ma famille.";
    const stored = sealAllianceAnswer(plaintext);

    expect(stored.answerLegacy).toBe("");
    expect(stored.answerEncrypted).not.toBe(plaintext);
    expect(stored.answerEncrypted).not.toContain(plaintext);
    expect(openAllianceAnswer(stored)).toBe(plaintext);
  });

  it("lit temporairement une ligne historique non encore backfillée", () => {
    expect(
      openAllianceAnswer({
        answerEncrypted: null,
        answerLegacy: "ancienne réponse",
      }),
    ).toBe("ancienne réponse");
  });

  it("reste fail-closed si le ciphertext est altéré, sans fallback legacy", () => {
    const stored = sealAllianceAnswer("réponse authentique");
    const [iv, tag, ciphertext] = stored.answerEncrypted!.split(".");
    const first = ciphertext[0] === "A" ? "B" : "A";
    const tampered = `${iv}.${tag}.${first}${ciphertext.slice(1)}`;
    expect(() =>
      openAllianceAnswer({
        answerEncrypted: tampered,
        answerLegacy: "fallback interdit",
      }),
    ).toThrow();
  });

  it("rejette une ligne incohérente sans ciphertext ni valeur historique", () => {
    expect(() =>
      openAllianceAnswer({
        answerEncrypted: null,
        answerLegacy: "",
      }),
    ).toThrow("Réponse Alliance absente");
  });

  it("ne produit un objet lisible qu'après déchiffrement explicite", () => {
    const readable = toReadableAllianceAnswer({
      questionId: "q1",
      userId: "user-1",
      ...sealAllianceAnswer("ma réponse"),
    });
    expect(readable).toEqual({
      questionId: "q1",
      userId: "user-1",
      answer: "ma réponse",
    });
    expect(readable).not.toHaveProperty("answerEncrypted");
    expect(readable).not.toHaveProperty("answerLegacy");
  });
});
