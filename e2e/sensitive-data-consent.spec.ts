import { expect, test, type Page } from "@playwright/test";

const EMAIL =
  process.env.E2E_SENSITIVE_CONSENT_EMAIL ??
  process.env.E2E_EMAIL ??
  "jonathan@demo.chemin-alliance.app";
const PASSWORD = process.env.E2E_PASSWORD;
const LOCALE = process.env.LOCALE ?? "fr";

async function login(page: Page) {
  await page.setExtraHTTPHeaders({ "x-forwarded-for": "203.0.113.210" });
  await page.goto(`/${LOCALE}/login`);
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD as string);
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.endsWith("/login"), {
    timeout: 20_000,
  });
}

test.describe("Retrait autonome du consentement sensible", () => {
  test.skip(!PASSWORD, "Définir E2E_PASSWORD pour le parcours authentifié.");

  test("retire, bloque le produit, conserve la confidentialité puis réactive", async ({
    page,
  }) => {
    await login(page);

    try {
      await page.goto(`/${LOCALE}/settings/privacy`);
      const card = page.getByTestId("sensitive-data-consent");
      await expect(card).toBeVisible();

      const withdrawal = page.waitForResponse(
        (response) =>
          response.url().endsWith("/api/me/consents/sensitive-data") &&
          response.request().method() === "DELETE",
      );
      await card
        .getByRole("button", { name: /retirer mon consentement/i })
        .click();
      await page
        .getByRole("dialog")
        .getByRole("button", { name: /retirer et suspendre/i })
        .click();
      expect((await withdrawal).status()).toBe(200);
      await expect(
        card.getByRole("button", { name: /réactiver mon consentement/i }),
      ).toBeVisible();

      await page.goto(`/${LOCALE}/suggestions`);
      await page.waitForURL((url) =>
        url.pathname.endsWith("/settings/privacy"),
      );
      await expect(page.getByTestId("sensitive-data-consent")).toContainText(
        /suspendu/i,
      );

      const grant = page.waitForResponse(
        (response) =>
          response.url().endsWith("/api/me/consents/sensitive-data") &&
          response.request().method() === "POST",
      );
      await page
        .getByTestId("sensitive-data-consent")
        .getByRole("button", { name: /réactiver mon consentement/i })
        .click();
      expect((await grant).status()).toBe(200);

      await page.goto(`/${LOCALE}/suggestions`);
      await expect(page).toHaveURL(new RegExp(`/${LOCALE}/suggestions$`));
    } finally {
      // Restaure la fixture même si une assertion visuelle échoue après le
      // retrait ; ce POST est idempotent et n'envoie aucune donnée métier.
      await page.request.post("/api/me/consents/sensitive-data");
    }
  });
});
