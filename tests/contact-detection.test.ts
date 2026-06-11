import { describe, expect, it } from "vitest";
import {
  detectContactLeak,
  leakKindsToActions,
} from "@/lib/moderation/contact-detection";

describe("detectContactLeak", () => {
  it("détecte +33612345678", () => {
    const r = detectContactLeak("Appelle-moi au +33612345678");
    expect(r.detected).toBe(true);
    expect(r.kinds).toContain("phone");
  });

  it("détecte 06 12 34 56 78", () => {
    const r = detectContactLeak("mon numéro 06 12 34 56 78 !");
    expect(r.detected).toBe(true);
    expect(r.kinds).toContain("phone");
  });

  it("détecte nom@gmail.com", () => {
    const r = detectContactLeak("écris-moi : nom@gmail.com");
    expect(r.kinds).toContain("email");
  });

  it("détecte 'mon insta @pseudo'", () => {
    const r = detectContactLeak("mon insta @pseudo_42");
    expect(r.kinds).toContain("social_platform");
    expect(r.kinds).toContain("social_handle");
  });

  it("détecte 'viens sur whatsapp'", () => {
    const r = detectContactLeak("viens sur WhatsApp ce soir");
    expect(r.kinds).toContain("social_platform");
  });

  it("détecte le contournement 'zéro six'", () => {
    const r = detectContactLeak("note : zéro six douze trente-quatre");
    expect(r.kinds).toContain("obfuscated_phone");
  });

  it("détecte un lien externe", () => {
    const r = detectContactLeak("regarde https://exemple.com/profil");
    expect(r.kinds).toContain("external_link");
  });

  it("ne bloque PAS un verset biblique (Jean 3:16)", () => {
    const r = detectContactLeak(
      "Mon verset préféré est Jean 3:16, et toi ?",
    );
    expect(r.detected).toBe(false);
  });

  it("ne bloque pas un message ordinaire", () => {
    const r = detectContactLeak(
      "Merci pour ton message hier. Ta vision de la famille m'a touchée.",
    );
    expect(r.detected).toBe(false);
  });

  it("mappe les détections vers les actions du moteur", () => {
    expect(leakKindsToActions(["phone"])).toEqual(["share_phone"]);
    expect(leakKindsToActions(["email", "social_handle"])).toEqual([
      "share_email",
      "share_social_network",
    ]);
  });
});
