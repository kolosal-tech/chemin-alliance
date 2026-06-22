import { test, expect, type Page } from "@playwright/test";

/**
 * Tests Liquid Glass — PUBLICS (aucune session requise).
 *
 * Cible : /[locale]/design-system, qui expose une vitrine « Liquid Glass »
 * (data-testid="glass-showcase") avec les VRAIES classes de l'app (.bubble,
 * .btn-glass*, .msg-scroll, switch role=switch). On valide ainsi le rendu des
 * tokens partagés sans toucher à la partie connectée ni à des données réelles.
 *
 * Couvre les exigences du brief : bulles lisibles (jamais invisibles), gutter
 * de scroll propre, switch accessible, et absence de message de debug
 * « Test loader » en production.
 */
const LOCALE = process.env.LOCALE ?? "fr";

// Luminance perçue (0=noir, 255=blanc) d'une couleur "rgb(r, g, b[, a])".
function luminance(rgb: string): number {
  const m = rgb.match(/(\d+(?:\.\d+)?)/g);
  if (!m || m.length < 3) return 0;
  const [r, g, b] = m.map(Number);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

async function gotoDesignSystem(page: Page): Promise<void> {
  await page.goto(`/${LOCALE}/design-system`);
  await page.getByTestId("glass-showcase").scrollIntoViewIfNeeded();
  await expect(page.getByTestId("glass-showcase")).toBeVisible();
}

test.describe("Liquid Glass — vitrine publique", () => {
  test("aucun message de debug « Test loader » en production", async ({
    page,
  }) => {
    await gotoDesignSystem(page);
    await expect(page.getByText("Test loader")).toHaveCount(0);
  });

  test("bulles envoyées/reçues présentes et lisibles", async ({ page }) => {
    await gotoDesignSystem(page);
    const peer = page.getByTestId("bubble-peer");
    const self = page.getByTestId("bubble-self").first();
    await expect(peer).toBeVisible();
    await expect(self).toBeVisible();

    // Une bulle « visible » a une taille réelle (jamais 0×0 = bulle fantôme).
    const peerBox = await peer.boundingBox();
    expect(peerBox?.width ?? 0).toBeGreaterThan(40);
    expect(peerBox?.height ?? 0).toBeGreaterThan(20);

    // Texte lisible en mode clair : couleur de texte SOMBRE (≠ couleur du fond
    // clair). Garantit que le texte n'est jamais « masqué par mauvaise couleur ».
    const peerColor = await peer.evaluate((el) => getComputedStyle(el).color);
    expect(luminance(peerColor)).toBeLessThan(120);

    const selfColor = await self.evaluate((el) => getComputedStyle(el).color);
    expect(luminance(selfColor)).toBeLessThan(120);
  });

  test("zone scrollable : gutter stable (scrollbar jamais sur les bulles)", async ({
    page,
  }) => {
    await gotoDesignSystem(page);
    const gutter = await page
      .getByTestId("msg-scroll")
      .evaluate((el) => getComputedStyle(el).scrollbarGutter);
    expect(gutter).toContain("stable");
  });

  test("boutons glass présents", async ({ page }) => {
    await gotoDesignSystem(page);
    const showcase = page.getByTestId("glass-showcase");
    await expect(showcase.locator("button.btn-glass")).toHaveCount(4);
  });

  test("switch accessible : role=switch + aria-checked", async ({ page }) => {
    await gotoDesignSystem(page);
    const switches = page.getByTestId("glass-showcase").getByRole("switch");
    await expect(switches).toHaveCount(2);
    await expect(switches.nth(0)).toHaveAttribute("aria-checked", "true");
    await expect(switches.nth(1)).toHaveAttribute("aria-checked", "false");
  });
});
