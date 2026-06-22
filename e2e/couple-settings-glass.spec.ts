import { test, expect, type Page } from "@playwright/test";

/**
 * Tests AUTHENTIFIÉS — messagerie couple, réglages, déconnexion.
 *
 * Nécessite un compte réel : fournir E2E_PASSWORD (et E2E_EMAIL si différent du
 * compte de test). Sans mot de passe, tout est SKIP (aucun secret committé).
 *
 *   BASE_URL=https://chemin-alliance.vercel.app NO_WEBSERVER=1 E2E_PASSWORD=… \
 *     npx playwright test e2e/couple-settings-glass.spec.ts
 *
 * Viewport mobile par défaut (iPhone/Pixel ~390x844, cf. playwright.config.ts).
 * Aucune action sensible (suppression, export, paiement, SMS) n'est déclenchée.
 */
const EMAIL = process.env.E2E_EMAIL ?? "mrkolosal+chemintest@gmail.com";
const PASSWORD = process.env.E2E_PASSWORD;
const LOCALE = process.env.LOCALE ?? "fr";

const SEND_RE = /envoyer|send|enviar/i;
const LOGOUT_RE = /se déconnecter|log out|cerrar sesión|terminar sessão/i;

async function login(page: Page): Promise<void> {
  await page.goto(`/${LOCALE}/login`);
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD as string);
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.endsWith("/login"), {
    timeout: 20_000,
  });
}

test.describe("Messagerie couple + réglages (glass)", () => {
  test.skip(
    !PASSWORD,
    "Définir E2E_PASSWORD pour exécuter les tests authentifiés.",
  );

  test("couple : champ message + Envoyer visibles, aucun « Test loader »", async ({
    page,
  }) => {
    await login(page);
    await page.goto(`/${LOCALE}/couple`);
    await page.waitForTimeout(800);

    // Aucun message de debug ne doit jamais apparaître en prod.
    const body = (await page.textContent("body")) ?? "";
    expect(body.toLowerCase()).not.toContain("test loader");

    // La messagerie n'existe que si l'espace couple est actif. Sinon on saute
    // (le compte de test n'a pas forcément de conjoint lié).
    const feed = page.locator(".msg-scroll").first();
    const hasMessaging = await feed.isVisible().catch(() => false);
    test.skip(!hasMessaging, "Pas d'espace couple actif sur ce compte.");

    // Bouton Envoyer visible et non masqué.
    const sendBtn = page.getByRole("button", { name: SEND_RE }).first();
    await expect(sendBtn).toBeVisible();

    // La barre de défilement ne chevauche pas les bulles : gutter stable
    // (desktop) ou scrollbar masquée (mobile) -> jamais de chevauchement.
    const overflowOk = await feed.evaluate((el) => {
      const s = getComputedStyle(el);
      return s.scrollbarGutter.includes("stable") || s.scrollbarWidth === "none";
    });
    expect(overflowOk).toBeTruthy();
  });

  test("réglages : bouton « Se déconnecter » présent et non masqué par la nav", async ({
    page,
  }) => {
    await login(page);
    await page.goto(`/${LOCALE}/settings/privacy`);

    const logout = page.getByRole("button", { name: LOGOUT_RE });
    await expect(logout).toBeVisible();

    // Le bouton n'est pas recouvert par la bottom-nav : son haut est au-dessus
    // du haut de la nav (le padding-bas de page dégage la barre).
    const nav = page.getByRole("navigation").first();
    const lb = await logout.boundingBox();
    const nb = await nav.boundingBox();
    if (lb && nb) {
      expect(lb.y).toBeLessThan(nb.y + 1);
    }
  });

  test("déconnexion : clic -> appel logout -> redirection vers /login", async ({
    page,
  }) => {
    await login(page);
    await page.goto(`/${LOCALE}/settings/privacy`);
    const logout = page.getByRole("button", { name: LOGOUT_RE });
    await expect(logout).toBeVisible();

    const logoutCall = page.waitForRequest(
      (r) => r.url().includes("/api/auth/logout") && r.method() === "POST",
    );
    await logout.click();
    await logoutCall; // la fonction de logout a bien été appelée
    await page.waitForURL((url) => url.pathname.endsWith("/login"), {
      timeout: 15_000,
    });
  });
});
