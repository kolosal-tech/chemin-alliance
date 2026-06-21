import { describe, it, expect } from "vitest";
import {
  isLocalXofCountry,
  priceOffer,
  formatOffer,
} from "@/lib/payments/pricing";

describe("pricing - prix segmenté diaspora vs zone XOF", () => {
  it("reconnaît les pays UEMOA (codes et noms, casse/espaces)", () => {
    for (const c of [
      "BF",
      "bf",
      " Burkina Faso ",
      "Côte d'Ivoire",
      "ci",
      "Sénégal",
      "mali",
      "TG",
    ]) {
      expect(isLocalXofCountry(c)).toBe(true);
    }
  });

  it("hors zone / inconnu / vide -> non local (jamais sous-facturer par erreur)", () => {
    // Cameroun = zone XAF (≠ XOF) : correctement exclu.
    for (const c of ["France", "fr", "US", "Cameroun", "", null, undefined]) {
      expect(isLocalXofCountry(c)).toBe(false);
    }
  });

  it("offre locale = Flutterwave / XOF / 2000 / mois", () => {
    expect(priceOffer("Burkina Faso")).toEqual({
      provider: "flutterwave",
      currency: "XOF",
      amount: 2000,
      interval: "month",
    });
  });

  it("offre diaspora/inconnu = Stripe / EUR / 9,99 / mois", () => {
    for (const c of ["France", null, "Canada"]) {
      const o = priceOffer(c);
      expect(o.provider).toBe("stripe");
      expect(o.currency).toBe("EUR");
      expect(o.amount).toBeCloseTo(9.99);
    }
  });

  it("formatOffer rend un libellé lisible par devise", () => {
    expect(formatOffer(priceOffer("bf"))).toMatch(/XOF/);
    expect(formatOffer(priceOffer("France"))).toMatch(/€/);
  });
});
