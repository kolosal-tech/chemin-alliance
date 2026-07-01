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

const EMAIL = process.env.E2E_EMAIL ?? "mrkolosal+chemintest@gmail.com";
const PASSWORD = process.env.E2E_PASSWORD;
const LOCALE = process.env.LOCALE ?? "fr";

async function login(page: Page): Promise<void> {
  await page.goto(`/${LOCALE}/login`);
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD as string);
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.endsWith("/login"), {
    timeout: 20_000,
  });
}

/**
 * Ouvre la première conversation de la liste /messages qui expose le panneau
 * de jeu (bouton "Jouer" visible = match humain-humain, non PENDING). Renvoie
 * false si aucune conversation éligible n'est trouvée (état de compte, pas un
 * bug) — le test appelant doit alors skip proprement.
 */
async function openFirstPlayableConversation(page: Page): Promise<boolean> {
  await page.goto(`/${LOCALE}/messages`);
  const links = page.locator('a[href*="/messages/"]');
  const count = await links.count();
  for (let i = 0; i < count; i += 1) {
    await links.nth(i).click();
    await page.waitForLoadState("networkidle");
    const playButton = page.getByRole("button", { name: "Jouer" });
    if (await playButton.isVisible().catch(() => false)) {
      return true;
    }
    await page.goto(`/${LOCALE}/messages`);
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

    // Ouvrir le panneau de jeu (fermé par défaut, monté sous forme de bouton).
    const playButton = page.getByRole("button", { name: "Jouer" });
    await expect(playButton).toBeVisible();
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
    const alreadyOpenRound = await sharedHint.isVisible().catch(() => false);

    if (!alreadyOpenRound) {
      const newRoundLabel = page.getByText("Nouvelle manche", { exact: true });
      const sharedModeButton = page.getByRole("button", {
        name: "Question partagée",
      });
      // "Nouvelle manche" n'apparaît que si aucune manche n'est OPEN — sinon
      // une manche GUESS pourrait déjà être en cours (pas notre mode cible).
      if (await newRoundLabel.isVisible().catch(() => false)) {
        await sharedModeButton.click();
      }
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
      await page.getByRole("button", { name: "Envoyer" }).click();

      // Après soumission : soit la réponse est scellée (l'autre n'a pas
      // encore répondu), soit la manche est immédiatement révélée si
      // l'autre avait déjà soumis. Les deux sont des succès fonctionnels.
      await expect(sealed.or(revealTitle)).toBeVisible({ timeout: 15_000 });
    }
  });
});
