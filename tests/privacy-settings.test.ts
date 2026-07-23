import { describe, expect, it } from "vitest";
import { privacySettingsPatchSchema } from "@/lib/privacy-settings";

describe("paramètres de confidentialité exposés", () => {
  it("n'accepte que les contrôles réellement appliqués par le moteur", () => {
    expect(
      privacySettingsPatchSchema.parse({
        antiMalaiseEnabled: true,
        invisibleMode: false,
      }),
    ).toEqual({ antiMalaiseEnabled: true, invisibleMode: false });
  });

  it("rejette le faux rayon et les niveaux génériques non appliqués", () => {
    expect(
      privacySettingsPatchSchema.safeParse({ antiMalaiseRadiusKm: 25 }).success,
    ).toBe(false);
    expect(
      privacySettingsPatchSchema.safeParse({
        fieldVisibility: { children: "PUBLIC_CONTROLLED" },
      }).success,
    ).toBe(false);
  });

  it("rejette une mise à jour vide", () => {
    expect(privacySettingsPatchSchema.safeParse({}).success).toBe(false);
  });
});
