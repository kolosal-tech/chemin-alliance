import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const component = readFileSync(
  new URL(
    "../app/[locale]/(app)/settings/privacy/privacy-panel.tsx",
    import.meta.url,
  ),
  "utf8",
);
const page = readFileSync(
  new URL("../app/[locale]/(app)/settings/privacy/page.tsx", import.meta.url),
  "utf8",
);

describe("interface du consentement général sensible", () => {
  it("reste accessible après retrait et utilise la route dédiée", () => {
    expect(page).toContain("requireAuthenticatedPageUser");
    expect(page).not.toContain("requirePageUser(");
    expect(component).toContain('fetch("/api/me/consents/sensitive-data"');
    expect(component).toContain('method: active ? "POST" : "DELETE"');
    expect(component).toContain('data-testid="sensitive-data-consent"');
  });

  it("confirme le retrait et conserve export/suppression visibles", () => {
    expect(component).toContain("confirmConsentWithdrawal");
    expect(component).toContain('t("privacy.consentWithdrawConfirmBody")');
    expect(component).toContain('href="/api/me/export"');
    expect(component).toContain("setConfirmDelete(true)");
    expect(component).toContain("<LogoutButton />");
  });

  it("fournit les libellés complets dans les quatre langues", () => {
    for (const locale of ["fr", "en", "es", "pt"]) {
      const messages = JSON.parse(
        readFileSync(
          new URL(`../messages/${locale}.json`, import.meta.url),
          "utf8",
        ),
      ) as { privacy: Record<string, string> };
      for (const key of [
        "consentTitle",
        "consentActive",
        "consentInactive",
        "consentEffect",
        "consentWithdraw",
        "consentGrant",
        "consentWithdrawConfirmBody",
      ]) {
        expect(messages.privacy[key], `${locale}.${key}`).toBeTruthy();
      }
    }
  });
});
