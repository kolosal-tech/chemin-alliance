import { describe, it, expect } from "vitest";
import {
  resolveRegion,
  culturalGuidance,
  culturalReference,
  CULTURE_REGIONS,
} from "@/lib/culture";

describe("culture - résolution pays → région", () => {
  it("Afrique de l'Ouest", () => {
    expect(resolveRegion("Côte d'Ivoire")?.key).toBe("afrique_ouest");
    expect(resolveRegion("Sénégal")?.key).toBe("afrique_ouest");
    expect(resolveRegion("burkina faso")?.key).toBe("afrique_ouest");
  });

  it("Afrique centrale", () => {
    expect(resolveRegion("Gabon")?.key).toBe("afrique_centrale");
    expect(resolveRegion("Cameroun")?.key).toBe("afrique_centrale");
  });

  it("Occident (France / Amérique du Nord)", () => {
    expect(resolveRegion("France")?.key).toBe("occident");
    expect(resolveRegion("Canada")?.key).toBe("occident");
  });

  it("Lusophone", () => {
    expect(resolveRegion("Brésil")?.key).toBe("lusophone");
    expect(resolveRegion("Portugal")?.key).toBe("lusophone");
  });

  it("Asie", () => {
    expect(resolveRegion("Vietnam")?.key).toBe("asie");
  });

  it("Maghreb / Afrique du Nord & Moyen-Orient", () => {
    expect(resolveRegion("Algérie")?.key).toBe("maghreb");
    expect(resolveRegion("Maroc")?.key).toBe("maghreb");
    expect(resolveRegion("Liban")?.key).toBe("maghreb");
  });

  it("collisions de sous-chaînes résolues (token le plus long gagne)", () => {
    expect(resolveRegion("Guinée équatoriale")?.key).toBe("afrique_centrale");
    expect(resolveRegion("Guinée-Bissau")?.key).toBe("lusophone");
    expect(resolveRegion("Guinée")?.key).toBe("afrique_ouest");
  });

  it("6 régions couvertes", () => {
    expect(CULTURE_REGIONS.length).toBe(6);
  });

  it("inconnu ou vide → null", () => {
    expect(resolveRegion(undefined)).toBeNull();
    expect(resolveRegion("")).toBeNull();
    expect(resolveRegion("Atlantide")).toBeNull();
  });

  it("bornes de mot : pas de faux positif sur une sous-chaîne dans un autre mot", () => {
    // "mali" est un token (Afrique de l'Ouest) mais ne doit pas matcher comme
    // simple sous-chaîne à l'intérieur d'un autre mot en texte libre.
    expect(resolveRegion("Je suis malicieuse de nature")).toBeNull();
    expect(resolveRegion("Un texte malintentionné")).toBeNull();
    // "inde" (Asie) ne doit pas matcher dans "independant".
    expect(resolveRegion("Je veux rester indépendante")).toBeNull();
    // "congo" (Afrique centrale) ne doit pas matcher dans "congolais" seul si
    // le token exact n'est pas présent comme mot - mais le mot lui-même doit
    // toujours matcher en tant que token isolé.
    expect(resolveRegion("Congo")?.key).toBe("afrique_centrale");
  });

  it("bornes de mot : le token reste détecté comme mot isolé dans une phrase libre", () => {
    expect(resolveRegion("Je viens du Mali, une belle région")?.key).toBe(
      "afrique_ouest",
    );
    expect(
      resolveRegion("Originaire de Côte d'Ivoire, arrivée en France")?.key,
    ).toBe("afrique_ouest");
  });
});

describe("culture - guidance pour le prompt", () => {
  it("sans pays : ne présume pas l'origine et liste toutes les régions", () => {
    const g = culturalGuidance();
    expect(g).toMatch(/ne présumes? jamais/i);
    expect(g).toMatch(/Afrique de l'Ouest/);
    expect(g).toMatch(/lusophone/i);
    expect(g).toMatch(/cadre biblique/i);
  });

  it("avec pays connu : cible la région et garde le cadre biblique", () => {
    const g = culturalGuidance("Côte d'Ivoire");
    expect(g).toMatch(/Afrique de l'Ouest/);
    expect(g).toMatch(/dot/i);
    // non-presomptif : ne l'affirme pas, laisse la personne preciser ou corriger
    expect(g).toMatch(/préciser ou corriger librement/i);
  });

  it("chaque région porte un cadre biblique et des points de vigilance", () => {
    for (const r of CULTURE_REGIONS) {
      expect(r.biblicalFrame.length).toBeGreaterThan(10);
      expect(r.cautions.length).toBeGreaterThan(10);
    }
    expect(culturalReference()).toMatch(/À discerner/);
  });
});
