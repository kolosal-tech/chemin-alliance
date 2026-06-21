import { test, expect, type Page, type Locator } from "@playwright/test";

/**
 * AUDIT CHEMIN D'ALLIANCE - Matrice des 4 profils.
 *
 * Selecteurs cales sur le code reel (verifie le 2026-06-21) :
 *  - login : /[locale]/login, input[name="email"] / input[name="password"]
 *  - succes login -> redirection hors /login (singles -> /suggestions)
 *  - floutage photo : il N'EXISTE PAS de classe CSS `.blur` sur les portraits.
 *    La protection est (1) une silhouette BlurHash rendue en <canvas> et
 *    (2) le proxy /api/photos/{id}/view qui renvoie 403 avant le stade
 *    DISCERNMENT. On audite donc la VRAIE protection : silhouette presente +
 *    aucune photo nette exposee avant devoilement.
 *  - Watchman : message POST -> analyzeRisk -> AgentInsight (COACH_ONLY) ;
 *    la banniere SafetyBanner lit /api/matches/{id}/safety-signal AU MONTAGE.
 *    Il faut donc RECHARGER apres envoi pour declencher le fetch.
 *
 * Variables d'env (toutes optionnelles) :
 *  BASE_URL (def http://localhost:3000), LOCALE (def fr),
 *  DEMO_PASSWORD (def Alliance2026!), MATCH_ID (conversation ouverte pour le
 *  test Watchman), PROFILE_*_EMAIL (override des comptes de la matrice).
 */

const LOCALE = process.env.LOCALE ?? "fr";
const PASSWORD = process.env.DEMO_PASSWORD ?? "Alliance2026!";
const MOBILE = { width: 390, height: 844 };

// Chaines FR reelles utilisees comme ancres de selection (messages/fr.json).
const REVEAL_BADGE = "Se dévoile en avançant"; // suggestions.photoReveal
const MSG_PLACEHOLDER = "Écrire un message…"; // messaging.placeholder
const BANNER_TITLE = "Vigilance"; // antiScam.bannerTitle

const env = (k: string, d: string) => process.env[k] ?? d;

type Scenario = {
  key: string;
  label: string;
  email: string;
  kind: "single" | "couple";
};

// Matrice des 4 profils. Comptes singles = seed reel (prisma/seed.ts, mdp
// Alliance2026!). Fiances/maries : aucun couple seede par defaut ; renseigne
// PROFILE_ENGAGED_EMAIL / PROFILE_MARRIED_EMAIL avec des comptes dont l'intent
// est engaged/married (inscription -> intent fiance/marie), sinon on retombe
// sur des comptes demo pour valider au moins le login + l'espace couple.
const SCENARIOS: Scenario[] = [
  {
    key: "single-male-evangelical",
    label: "Célibataire A - Homme évangélique",
    email: env("PROFILE_A_EMAIL", "jonathan@demo.chemin-alliance.app"),
    kind: "single",
  },
  {
    key: "single-female-catholic",
    label: "Célibataire B - Femme catholique",
    email: env("PROFILE_B_EMAIL", "marie-claire@demo.chemin-alliance.app"),
    kind: "single",
  },
  {
    key: "engaged-couple",
    label: "Fiancés (Couple C&D)",
    email: env("PROFILE_ENGAGED_EMAIL", "elodie@demo.chemin-alliance.app"),
    kind: "couple",
  },
  {
    key: "married-couple",
    label: "Mariés (Couple E&F)",
    email: env("PROFILE_MARRIED_EMAIL", "emmanuel@demo.chemin-alliance.app"),
    kind: "couple",
  },
];

// Surbrillance orange marque (#e85d26) ~1s : lisibilite des captures/videos.
async function highlight(locator: Locator, ms = 1000): Promise<void> {
  try {
    await locator.first().evaluate((el, color) => {
      const e = el as HTMLElement;
      e.style.outline = `3px solid ${color}`;
      e.style.outlineOffset = "2px";
      e.style.transition = "outline 120ms ease";
      e.scrollIntoView({ block: "center" });
      window.setTimeout(() => {
        e.style.outline = "";
        e.style.outlineOffset = "";
      }, 1000);
    }, "#e85d26");
    await locator.page().waitForTimeout(ms);
  } catch {
    // Element volatil : une surbrillance ratee ne doit jamais faire echouer l'audit.
  }
}

async function login(page: Page, email: string): Promise<void> {
  await page.setViewportSize(MOBILE); // redimensionnement mobile explicite (brief)
  await page.goto(`/${LOCALE}/login`);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', PASSWORD);
  const submit = page.locator('form button[type="submit"]');
  await highlight(submit);
  await submit.click();
  // Succes = on quitte /login. (Singles -> /suggestions, autres -> page d'accueil app.)
  await page.waitForURL((url) => !url.pathname.endsWith("/login"), {
    timeout: 20_000,
  });
}

test.describe("Audit Chemin d'Alliance - Matrice des 4 profils (mobile 390x844)", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(MOBILE);
  });

  for (const s of SCENARIOS) {
    test(`[${s.label}] login + acces au parcours`, async ({ page }) => {
      await login(page, s.email);

      if (s.kind === "single") {
        await page.goto(`/${LOCALE}/suggestions`);
        await expect(page).toHaveURL(/\/suggestions/);
      } else {
        // Espace couple (fiances/maries) - hors matching.
        const res = await page.goto(`/${LOCALE}/couple`);
        expect(res?.status() ?? 200).toBeLessThan(400);
      }

      await page.waitForTimeout(400);
      await page.screenshot({
        path: `test-results/shots/${s.key}.png`,
        fullPage: true,
      });
    });
  }

  test("Floutage par defaut des portraits (silhouette + aucune photo nette)", async ({
    page,
  }) => {
    // Compte single avec suggestions potentielles.
    await login(
      page,
      env("PROFILE_A_EMAIL", "jonathan@demo.chemin-alliance.app"),
    );
    await page.goto(`/${LOCALE}/suggestions`);
    await page.waitForTimeout(800);

    const silhouettes = page.locator("canvas");
    const count = await silhouettes.count();
    test.skip(
      count === 0,
      "Aucune suggestion pour ce compte (seed/match requis) - rien a auditer.",
    );

    // 1) Silhouette BlurHash visible (le portrait n'est jamais brut).
    await expect(silhouettes.first()).toBeVisible();
    await highlight(silhouettes.first());

    // 2) Aucune photo nette servie par le proxy avant devoilement.
    await expect(page.locator('img[src*="/api/photos/"]')).toHaveCount(0);

    // 3) Badge explicite « Se dévoile en avançant ».
    const badge = page.getByText(REVEAL_BADGE).first();
    await expect(badge).toBeVisible();
    await highlight(badge);

    await page.screenshot({ path: "test-results/shots/blur-default.png" });
  });

  test("Watchman - message d'arnaque -> banniere de vigilance", async ({
    page,
  }) => {
    const matchId = process.env.MATCH_ID;
    test.skip(
      !matchId,
      "Definir MATCH_ID=<id d'un match avec conversation ouverte> pour ce test.",
    );

    const email = env("WATCHMAN_EMAIL", SCENARIOS[0].email);
    await login(page, email);
    await page.goto(`/${LOCALE}/messages/${matchId}`);

    const input = page.getByPlaceholder(MSG_PLACEHOLDER);
    await expect(input).toBeVisible({ timeout: 15_000 });

    // Deux appats de severite HIGH : money_request + gift_card_crypto.
    const baits = [
      "Envoie-moi 500 euros par Western Union, c'est une urgence",
      "On finit ca par virement bitcoin sur mon wallet crypto",
    ];
    for (const bait of baits) {
      await input.fill(bait);
      await highlight(input);
      await page.locator('form button[type="submit"]').last().click();
      await page.waitForTimeout(900);
    }

    // La banniere fetch /safety-signal au montage : recharger apres persistance.
    await page.reload();

    const banner = page
      .locator('[data-testid="safety-banner"]')
      .or(page.getByText(BANNER_TITLE));
    await expect(banner.first()).toBeVisible({ timeout: 15_000 });
    await highlight(banner.first());

    await page.screenshot({ path: "test-results/shots/watchman-banner.png" });
  });
});
