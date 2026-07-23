import { test, expect, type Page } from "@playwright/test";

/**
 * Jeu de couple/match (construction C, hybride, SANS FIN) — parcours humain-humain.
 *
 * Pages authentifiées -> nécessite un compte réel avec au moins une conversation
 * de match HUMAIN-HUMAIN acceptée (pas un Compagnon IA, pas PENDING). Fournir
 * E2E_PASSWORD (et E2E_EMAIL si différent du compte de test). Sans mot de passe,
 * tout est SKIP (aucun secret committé), comme les autres specs authentifiées
 * (cf. e2e/ux-batch-fixes.spec.ts, e2e/couple-settings-glass.spec.ts).
 *
 * Le compte de test peut ne pas avoir de match humain-humain accepté au moment
 * du run (données réelles, imprévisibles) : dans ce cas les tests qui en ont
 * besoin passent en skip() au runtime plutôt que d'échouer — ce n'est pas une
 * régression de code, c'est un état de compte.
 *
 * Sélecteurs calés sur les libellés i18n réels de couple_game.ui (cf.
 * messages/fr.json : "Jouer", "Question partagée", "Ta réponse", "Envoyer",
 * "En attente de l'autre...", "Nouvelle manche").
 *
 * Cible : BASE_URL (def http://localhost:3000). Pour valider la prod déployée :
 *   BASE_URL=https://chemin-alliance.vercel.app NO_WEBSERVER=1 E2E_PASSWORD=… \
 *   npx playwright test e2e/couple-game.spec.ts
 */

const EMAIL =
  process.env.E2E_MATCH_EMAIL ??
  process.env.E2E_EMAIL ??
  "mrkolosal+chemintest@gmail.com";
const PASSWORD = process.env.E2E_PASSWORD;
const LOCALE = process.env.LOCALE ?? "fr";

async function login(page: Page): Promise<void> {
  await page.setExtraHTTPHeaders({ "x-forwarded-for": "203.0.113.20" });
  await page.goto(`/${LOCALE}/login`);
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD as string);
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.endsWith("/login"), {
    timeout: 20_000,
  });
  await page
    .locator('input[name="email"]')
    .waitFor({ state: "detached", timeout: 10_000 });
}

/**
 * Ouvre la première conversation de la liste /messages qui expose le panneau
 * de jeu (bouton "Jouer" visible = match humain-humain, non PENDING). Renvoie
 * false si aucune conversation éligible n'est trouvée (état de compte, pas un
 * bug) — le test appelant doit alors skip proprement.
 */
async function openFirstPlayableConversation(page: Page): Promise<boolean> {
  await page.goto(`/${LOCALE}/messages`);
  const hrefs = await page
    .locator('a[href*="/messages/"]')
    .evaluateAll((links) =>
      [
        ...new Set(
          links
            .map((link) => link.getAttribute("href"))
            .filter((href): href is string => Boolean(href)),
        ),
      ].filter((href) => !href.endsWith("/messages")),
    );

  for (const href of hrefs) {
    // La page de conversation maintient des requêtes longues/polling : l'état
    // `networkidle` n'est donc pas un signal de disponibilité fiable. Le DOM
    // et le contrôle métier visible sont les critères réellement utiles.
    await page.goto(href, { waitUntil: "domcontentloaded" });
    const playButton = page.getByRole("button", { name: "Jouer" });
    if (
      await playButton
        .waitFor({ state: "visible", timeout: 3_000 })
        .then(() => true)
        .catch(() => false)
    ) {
      return true;
    }
  }
  return false;
}

test.describe("Jeu des questions — match humain-humain", () => {
  test.skip(
    !PASSWORD,
    "Définir E2E_PASSWORD pour exécuter les tests authentifiés.",
  );

  test("ouvrir le panneau Jeu, lancer une manche partagée, répondre", async ({
    page,
  }) => {
    await login(page);
    const eligible = await openFirstPlayableConversation(page);
    test.skip(
      !eligible,
      "Aucune conversation humain-humain non-PENDING trouvée pour ce compte de test.",
    );

    await page.setViewportSize({ width: 320, height: 568 });
    const partnerNameFits = await page
      .getByTestId("conversation-partner-name")
      .evaluate((name) => name.scrollWidth <= name.clientWidth + 1);
    expect(partnerNameFits).toBeTruthy();

    // Les questions suggérées constituent un carrousel mobile : aucun texte
    // ne doit déborder de son bouton ni recouvrir la suggestion suivante.
    const suggestions = page.getByTestId("ai-suggestions");
    if (await suggestions.isVisible().catch(() => false)) {
      const suggestionButtons = suggestions.getByRole("button");
      const suggestionCount = await suggestionButtons.count();
      for (let index = 0; index < suggestionCount; index += 1) {
        const fitsButton = await suggestionButtons
          .nth(index)
          .evaluate(
            (button) =>
              button.scrollWidth <= button.clientWidth + 1 &&
              button.scrollHeight <= button.clientHeight + 1,
          );
        expect(fitsButton).toBeTruthy();
      }
    }

    // Ouvrir le panneau de jeu (fermé par défaut, monté sous forme de bouton).
    const playButton = page.getByRole("button", { name: "Jouer" });
    await expect(playButton).toBeVisible();
    await expect(playButton).toBeEnabled();
    await playButton.click();

    // Le panneau s'ouvre : titre + sous-titre du jeu visibles.
    await expect(
      page.getByText("Le jeu des questions", { exact: true }),
    ).toBeVisible();

    // Soit une manche est déjà OPEN (état précédent), soit on lance une
    // manche partagée nous-mêmes via "Nouvelle manche" -> "Question partagée".
    const sharedHint = page.getByText(
      "Vous répondez chacun·e honnêtement. Les réponses restent secrètes jusqu'à ce que vous ayez tou·te·s les deux répondu.",
    );
    const guessHint = page.getByText(
      "L'un·e répond honnêtement, l'autre devine sa réponse. Le résultat dira si vous êtes proches !",
    );
    const newRoundLabel = page.getByText("Nouvelle manche", { exact: true });

    // Le premier GET du panneau est asynchrone : attendre un état métier
    // chargé évite de décider pendant l'affichage transitoire du spinner.
    await expect(sharedHint.or(guessHint).or(newRoundLabel)).toBeVisible({
      timeout: 15_000,
    });
    test.skip(
      await guessHint.isVisible().catch(() => false),
      "Une manche « Devine ma réponse » est déjà ouverte sur ce compte.",
    );

    if (await newRoundLabel.isVisible().catch(() => false)) {
      const sharedModeButton = page.getByRole("button", {
        name: "Question partagée",
      });
      await expect(sharedModeButton).toBeEnabled();
      await sharedModeButton.click();
      await expect(sharedHint).toBeVisible({ timeout: 15_000 });
    }

    // Une question doit maintenant être affichée, avec un des deux états
    // possibles : formulaire de réponse, ou réponse déjà scellée/révélée.
    const answerLabel = page.getByText("Ta réponse", { exact: true });
    const sealed = page.getByText("Réponse scellée jusqu'à la révélation.", {
      exact: true,
    });
    const revealTitle = page.getByText("Révélation", { exact: true });
    await expect(answerLabel.or(sealed).or(revealTitle)).toBeVisible({
      timeout: 15_000,
    });

    // Si le formulaire de réponse est présent (rôle "answer", pas encore
    // soumis), on répond honnêtement et on vérifie l'accusé de réception.
    if (await answerLabel.isVisible().catch(() => false)) {
      const textarea = page.getByPlaceholder("Écris ta réponse ici...");
      await expect(textarea).toBeVisible();
      await textarea.fill("Réponse e2e — jeu des questions.");
      await textarea
        .locator("..")
        .getByRole("button", { name: "Envoyer" })
        .click();

      // Après soumission : soit la réponse est scellée (l'autre n'a pas
      // encore répondu), soit la manche est immédiatement révélée si
      // l'autre avait déjà soumis. Les deux sont des succès fonctionnels.
      await expect(sealed.or(revealTitle)).toBeVisible({ timeout: 15_000 });
    }
  });
});
