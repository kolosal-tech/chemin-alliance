import { describe, expect, it } from "vitest";
import { buildPreMatchSuggestionProfile } from "@/lib/suggestion-profile";
import { compatibilityTopics } from "@/lib/matching";

function source(intentionVisibility = "PRIVATE") {
  return {
    id: "candidate-1",
    displayName: "Ada",
    age: 31,
    isVerified: true,
    kind: "HUMAN" as const,
    photoBlurredByDefault: true,
    photoBlurhash: "L5H2EC=PM+yV0g-mq.wG9c010J}I",
    cityApprox: "Paris",
    faithProfile: {
      vertical: "CHRISTIAN_EVANGELICAL" as const,
      denomination: "Évangélique",
    },
    relationshipProfile: {
      intentionStatement: "Construire un foyer",
      intentionVisibility,
      maritalStatus: "single_parent",
      hasChildren: true,
      wantsChildren: false,
      acceptsChildren: true,
    },
    sponsor: { relation: "friend" },
  };
}

describe("projection publique des suggestions", () => {
  it("ne sérialise aucun champ familial ou géographique", () => {
    const projected = buildPreMatchSuggestionProfile(source());

    expect(projected).not.toHaveProperty("maritalStatus");
    expect(projected).not.toHaveProperty("hasChildren");
    expect(projected).not.toHaveProperty("wantsChildren");
    expect(projected).not.toHaveProperty("acceptsChildren");
    expect(projected).not.toHaveProperty("cityApprox");
    expect(projected.intentionStatement).toBeNull();
  });

  it("n'expose l'intention que lorsqu'elle est explicitement publique", () => {
    expect(
      buildPreMatchSuggestionProfile(source("PUBLIC_CONTROLLED"))
        .intentionStatement,
    ).toBe("Construire un foyer");
  });
});

describe("radar de compatibilité et divulgation progressive", () => {
  const me = {
    cityApprox: "Paris",
    faithProfile: { vertical: "CHRISTIAN_EVANGELICAL" as const },
    relationshipProfile: {
      intentionStatement: "Mariage",
      wantsChildren: true,
      hasChildren: false,
      acceptsChildren: true,
    },
  };
  const other = {
    cityApprox: "Paris",
    faithProfile: { vertical: "CHRISTIAN_EVANGELICAL" as const },
    relationshipProfile: {
      intentionStatement: "Mariage",
      wantsChildren: true,
      hasChildren: false,
      acceptsChildren: true,
    },
  };

  it("neutralise famille, ville et intention avant un match actif", () => {
    expect(compatibilityTopics(me, other).axes).toMatchObject({
      children: 0.5,
      location: 0.5,
      vision: 0.5,
    });
  });

  it("ne calcule les axes privés qu'après autorisation explicite", () => {
    expect(
      compatibilityTopics(me, other, {
        revealFamily: true,
        revealLocation: true,
        revealVision: true,
      }).axes,
    ).toMatchObject({
      children: 0.9,
      location: 0.85,
      vision: 0.8,
    });
  });
});
