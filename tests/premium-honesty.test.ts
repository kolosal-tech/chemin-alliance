import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const locales = ["fr", "en", "es", "pt"] as const;

describe("offre Premium - promesses reliées au produit", () => {
  it("n'affiche le bouton d'achat que si checkout et webhook sont prêts", () => {
    const source = readFileSync(
      path.join(process.cwd(), "app/[locale]/(app)/settings/premium/page.tsx"),
      "utf8",
    );
    expect(source).toContain("stripeCheckoutEnabled");
    expect(source).toContain(") : stripeCheckoutEnabled ? (");
    expect(source).toContain('const FEATURES = ["ai", "mission"] as const;');
    expect(source).not.toMatch(
      /FEATURES\s*=\s*\[[^\]]*(?:discovery|report|calls)/,
    );
  });

  it.each(locales)(
    "ne promet ni prix fixe ni fonctionnalité non livrée dans la locale %s",
    (locale) => {
      const messages = JSON.parse(
        readFileSync(
          path.join(process.cwd(), `messages/${locale}.json`),
          "utf8",
        ),
      ) as {
        premium: Record<string, string>;
      };
      const premium = messages.premium;
      const rendered = JSON.stringify(premium).toLowerCase();

      expect(premium.feature_ai).toBeTruthy();
      expect(premium.feature_mission).toBeTruthy();
      expect(premium.feature_discovery).toBeUndefined();
      expect(premium.feature_report).toBeUndefined();
      expect(premium.feature_calls).toBeUndefined();
      expect(rendered).not.toMatch(/9[,.]99/);
    },
  );
});
