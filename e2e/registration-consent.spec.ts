import { expect, test } from "@playwright/test";

const LOCALES = [
  {
    locale: "fr",
    sensitive: /retirer cet accord depuis Confidentialité/i,
    terms: /Conditions d'utilisation.*charte de conduite/i,
  },
  {
    locale: "en",
    sensitive: /withdraw this consent from Privacy/i,
    terms: /Terms of Service.*code of conduct/i,
  },
  {
    locale: "es",
    sensitive: /retirar este consentimiento desde Privacidad/i,
    terms: /Condiciones de uso.*carta de conducta/i,
  },
  {
    locale: "pt",
    sensitive: /retirar este consentimento em Privacidade/i,
    terms: /Termos de utilização.*carta de conduta/i,
  },
] as const;

test("inscription : consentements informés, obligatoires et sans overflow dans 4 langues", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });

  for (const {
    locale,
    sensitive: sensitiveCopy,
    terms: termsCopy,
  } of LOCALES) {
    await page.goto(`/${locale}/register`);

    const sensitive = page.locator('input[name="consentSensitive"]');
    const terms = page.locator('input[name="consentTerms"]');
    const sensitiveLabel = page.locator(
      'label:has(input[name="consentSensitive"])',
    );
    const termsLabel = page.locator('label:has(input[name="consentTerms"])');

    await expect(sensitiveLabel).toBeVisible();
    await expect(termsLabel).toBeVisible();
    await expect(sensitiveLabel).toContainText(sensitiveCopy);
    await expect(termsLabel).toContainText(termsCopy);
    await expect(sensitive).toHaveAttribute("required", "");
    await expect(terms).toHaveAttribute("required", "");

    expect(await sensitive.evaluate((input) => input.checkValidity())).toBe(
      false,
    );
    expect(await terms.evaluate((input) => input.checkValidity())).toBe(false);
    await sensitive.check();
    await terms.check();
    expect(await sensitive.evaluate((input) => input.checkValidity())).toBe(
      true,
    );
    expect(await terms.evaluate((input) => input.checkValidity())).toBe(true);

    await expect(
      page.locator(`a[href="/${locale}/legal/terms"]`),
    ).toBeVisible();
    await expect(
      page.locator(`a[href="/${locale}/legal/privacy"]`),
    ).toBeVisible();

    const horizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(horizontalOverflow).toBeLessThanOrEqual(1);
  }
});
