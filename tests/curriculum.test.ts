import { describe, it, expect } from "vitest";
import { getCurriculum, getModule } from "@/lib/curriculum";

describe("curriculum - modules de préparation au mariage", () => {
  it("6 modules, un par étape, dans l'ordre du parcours", () => {
    const mods = getCurriculum("fr");
    expect(mods).toHaveLength(6);
    expect(mods.map((m) => m.stage)).toEqual([
      "DISCOVERY",
      "DIALOGUE",
      "DISCERNMENT",
      "ACCOMPANIMENT",
      "COMMITMENT",
      "MARRIAGE_PREPARATION",
    ]);
  });

  it("chaque module a titre, résumé, écriture, thèmes, réflexion, pratique", () => {
    for (const m of getCurriculum("fr")) {
      expect(m.title.length).toBeGreaterThan(0);
      expect(m.summary.length).toBeGreaterThan(0);
      expect(m.scripture.length).toBeGreaterThanOrEqual(1);
      expect(m.themes.length).toBeGreaterThanOrEqual(1);
      expect(m.reflection.length).toBeGreaterThanOrEqual(1);
      expect(m.practice.length).toBeGreaterThan(0);
    }
  });

  it("localisation : fr et en diffèrent", () => {
    const fr = getCurriculum("fr")[0];
    const en = getCurriculum("en")[0];
    expect(fr.id).toBe(en.id);
    expect(fr.title).not.toBe(en.title);
  });

  it("notes par verticale : attachées seulement sur les modules concernés", () => {
    const evan = getCurriculum("fr", "CHRISTIAN_EVANGELICAL");
    const cath = getCurriculum("fr", "CHRISTIAN_CATHOLIC");
    const evanCovenant = evan.find((m) => m.id === "covenant_commitment");
    const cathCovenant = cath.find((m) => m.id === "covenant_commitment");
    expect(evanCovenant?.verticalNote).toBeTruthy();
    expect(cathCovenant?.verticalNote).toBeTruthy();
    // notes doctrinales distinctes selon la verticale
    expect(evanCovenant?.verticalNote).not.toBe(cathCovenant?.verticalNote);
    // module sans note -> null
    expect(
      evan.find((m) => m.id === "true_communication")?.verticalNote,
    ).toBeNull();
  });

  it("sans verticale : aucune note attachée", () => {
    for (const m of getCurriculum("fr")) expect(m.verticalNote).toBeNull();
  });

  it("getModule renvoie un module par id, ou null", () => {
    expect(getModule("foundations_identity", "fr")?.stage).toBe("DISCOVERY");
    expect(getModule("inexistant", "fr")).toBeNull();
  });
});
