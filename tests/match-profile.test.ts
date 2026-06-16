import { describe, it, expect } from "vitest";
import { encryptField } from "@/lib/security/crypto";
import { buildMatchProfileView } from "@/lib/match-profile";
import type { VisibilityLevel } from "@prisma/client";

function faith(
  over: Partial<{
    testimonyEncrypted: string | null;
    testimonyVisibility: VisibilityLevel;
    localChurchEncrypted: string | null;
    localChurchVisibility: VisibilityLevel;
  }> = {},
) {
  return {
    testimonyEncrypted: encryptField("Sauvé en 2018, baptisé à Ouaga."),
    testimonyVisibility: "AFTER_MATCH" as VisibilityLevel,
    localChurchEncrypted: encryptField("Assemblée de Dieu, Tampouy"),
    localChurchVisibility: "AFTER_DISCERNMENT" as VisibilityLevel,
    ...over,
  };
}

function relationship(
  over: Partial<{
    intentionStatement: string | null;
    intentionVisibility: VisibilityLevel;
    hasChildren: boolean;
    childrenVisibility: VisibilityLevel;
    familyVisionEncrypted: string | null;
    familyVisionVisibility: VisibilityLevel;
  }> = {},
) {
  return {
    intentionStatement: "Fonder un foyer chrétien",
    intentionVisibility: "PUBLIC_CONTROLLED" as VisibilityLevel,
    hasChildren: true,
    childrenVisibility: "AFTER_MATCH" as VisibilityLevel,
    familyVisionEncrypted: encryptField("Trois enfants, école à la maison."),
    familyVisionVisibility: "AFTER_DIALOGUE" as VisibilityLevel,
    ...over,
  };
}

function get(fields: ReturnType<typeof buildMatchProfileView>, key: string) {
  const f = fields.find((x) => x.key === key);
  if (!f) throw new Error(`champ ${key} absent`);
  return f;
}

describe("buildMatchProfileView — exposition progressive", () => {
  it("PUBLIC_CONTROLLED (intention) est visible même sans match", () => {
    const fields = buildMatchProfileView(
      { faith: null, relationship: relationship() },
      { matched: false, stage: null },
    );
    const intention = get(fields, "intention");
    expect(intention.visible).toBe(true);
    expect(intention.value).toBe("Fonder un foyer chrétien");
  });

  it("AFTER_MATCH (témoignage) caché sans match, déchiffré une fois matché", () => {
    const profile = { faith: faith(), relationship: null };

    const locked = buildMatchProfileView(profile, {
      matched: false,
      stage: null,
    });
    expect(get(locked, "testimony").visible).toBe(false);
    expect(get(locked, "testimony").value).toBeNull();

    const unlocked = buildMatchProfileView(profile, {
      matched: true,
      stage: "DISCOVERY",
    });
    expect(get(unlocked, "testimony").visible).toBe(true);
    expect(get(unlocked, "testimony").value).toBe(
      "Sauvé en 2018, baptisé à Ouaga.",
    );
  });

  it("AFTER_DIALOGUE (vision familiale) caché en Découverte, visible dès Dialogue", () => {
    const profile = { faith: null, relationship: relationship() };

    const discovery = buildMatchProfileView(profile, {
      matched: true,
      stage: "DISCOVERY",
    });
    expect(get(discovery, "familyVision").visible).toBe(false);

    const dialogue = buildMatchProfileView(profile, {
      matched: true,
      stage: "DIALOGUE",
    });
    expect(get(dialogue, "familyVision").visible).toBe(true);
    expect(get(dialogue, "familyVision").value).toBe(
      "Trois enfants, école à la maison.",
    );
  });

  it("AFTER_DISCERNMENT (église locale) visible seulement à partir du Discernement", () => {
    const profile = { faith: faith(), relationship: null };

    const dialogue = buildMatchProfileView(profile, {
      matched: true,
      stage: "DIALOGUE",
    });
    expect(get(dialogue, "localChurch").visible).toBe(false);

    const discernment = buildMatchProfileView(profile, {
      matched: true,
      stage: "DISCERNMENT",
    });
    expect(get(discernment, "localChurch").visible).toBe(true);
    expect(get(discernment, "localChurch").value).toBe(
      "Assemblée de Dieu, Tampouy",
    );
  });

  it("enfants (booléen) rendu oui/non quand visible", () => {
    const profile = {
      faith: null,
      relationship: relationship({ hasChildren: false }),
    };
    const unlocked = buildMatchProfileView(profile, {
      matched: true,
      stage: "DISCOVERY",
    });
    expect(get(unlocked, "children").visible).toBe(true);
    expect(get(unlocked, "children").value).toBe("no");
  });

  it("expose l'étape de déverrouillage pour les champs verrouillés", () => {
    const profile = { faith: faith(), relationship: relationship() };
    const fields = buildMatchProfileView(profile, {
      matched: false,
      stage: null,
    });
    expect(get(fields, "testimony").unlocksAtStep).toBe(1); // AFTER_MATCH
    expect(get(fields, "familyVision").unlocksAtStep).toBe(2); // AFTER_DIALOGUE
    expect(get(fields, "localChurch").unlocksAtStep).toBe(3); // AFTER_DISCERNMENT
  });

  it("omet les champs dont le sous-profil est absent", () => {
    const fields = buildMatchProfileView(
      { faith: null, relationship: null },
      { matched: true, stage: "MARRIAGE_PREPARATION" },
    );
    expect(fields).toHaveLength(0);
  });
});
