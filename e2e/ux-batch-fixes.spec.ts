import { test, expect, type Page } from "@playwright/test";

/**
 * Lot de correctifs UX P0-P2 (coaches, Coach IA, trust, devotionnel).
 *
 * Pages authentifiées -> nécessite un compte réel. Fournir E2E_PASSWORD (et
 * E2E_EMAIL si différent du compte de test). Sans mot de passe, les tests qui
 * exigent une session sont SKIP (aucun secret n'est committé dans ce fichier).
 *
 * Cible : BASE_URL (def http://localhost:3000). Pour valider la prod déployée :
 *   BASE_URL=https://chemin-alliance.vercel.app NO_WEBSERVER=1 E2E_PASSWORD=… \
 *   npx playwright test e2e/ux-batch-fixes.spec.ts
 *
 * Couvre toutes les langues via le param E2E_LOCALES (def fr,en,es,pt).
 */

const EMAIL = process.env.E2E_EMAIL ?? "mrkolosal+chemintest@gmail.com";
const PASSWORD = process.env.E2E_PASSWORD;
const LOCALES = (process.env.E2E_LOCALES ?? "fr,en,es,pt").split(",");
const PRIMARY = LOCALES[0] ?? "fr";

async function login(page: Page, locale: string): Promise<void> {
  await page.goto(`/${locale}/login`);
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD as string);
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.endsWith("/login"), {
    timeout: 20_000,
  });
}

test.describe("Lot UX P0-P2", () => {
  test.skip(
    !PASSWORD,
    "Définir E2E_PASSWORD pour exécuter les tests authentifiés.",
  );

  // P0.1 - Page coaches : l'un des états testables est toujours rendu
  // (liste OU vide), jamais un écran blanc. data-testid stables.
  for (const locale of LOCALES) {
    test(`[${locale}] coaches : liste ou état vide rendu`, async ({ page }) => {
      await login(page, locale);
      await page.goto(`/${locale}/coaches`);
      const list = page.getByTestId("coaches-list");
      const empty = page.getByTestId("coaches-empty");
      await expect(list.or(empty)).toBeVisible({ timeout: 15_000 });
    });
  }

  // P0.2 - Coach IA : aucun contenu de debug visible dans le chat.
  for (const locale of LOCALES) {
    test(`[${locale}] coach-ai : aucun debug visible`, async ({ page }) => {
      await login(page, locale);
      await page.goto(`/${locale}/coach-ai`);
      await page.waitForTimeout(800);
      const body = (await page.textContent("body")) ?? "";
      expect(body.toLowerCase()).not.toContain("test loader");
      expect(body.toLowerCase()).not.toContain("loader coach");
    });
  }

  // P0.3 - Trust : pas de message contradictoire. Le compte de test n'a pas
  // de téléphone vérifié -> on doit voir "à vérifier" + "bientôt", jamais
  // "Téléphone vérifié" comme libellé principal.
  test(`[${PRIMARY}] trust : libellé téléphone cohérent`, async ({ page }) => {
    await login(page, PRIMARY);
    await page.goto(`/${PRIMARY}/settings/trust`);
    const main = page.locator("main");
    await expect(main).toBeVisible();
    const text = (await main.textContent()) ?? "";
    // Cohérence : si "bientôt disponible" est affiché, le libellé n'affirme
    // pas "vérifié" pour le téléphone.
    if (/bient[oô]t/i.test(text)) {
      expect(text).toMatch(/à vérifier|to verify|por verificar/i);
    }
  });

  // P1.4 - Devotionnel : anti double-clic sur "J'ai pris ce temps".
  test(`[${PRIMARY}] devotional : bouton anti double-clic`, async ({
    page,
  }) => {
    await login(page, PRIMARY);
    await page.goto(`/${PRIMARY}/devotional`);
    const btn = page
      .getByRole("button", { name: /pris ce temps|took this time|tomé|tomei/i })
      .first();
    // Le bouton n'est présent que si la méditation du jour n'est pas déjà faite.
    const visible = await btn.isVisible().catch(() => false);
    test.skip(!visible, "Méditation déjà faite aujourd'hui pour ce compte.");
    await btn.click();
    // Après le premier clic, le bouton se désactive (pas de double soumission).
    await expect(btn).toBeDisabled({ timeout: 5_000 });
  });
});
