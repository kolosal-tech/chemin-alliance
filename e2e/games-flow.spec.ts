import { test, expect, type Page } from "@playwright/test";

/**
 * Parcours du mode jeu "Alliance Lab" reconnecté (dormant depuis #43, réactivé
 * cette session) : /profile -> carte discrète -> /games (chooser personas) ->
 * /games/play (DISC) -> synthèse pastorale finale.
 *
 * Page authentifiée -> nécessite un compte réel avec au moins une AiPersona
 * active en base. Fournir E2E_PASSWORD (et E2E_EMAIL si différent du compte
 * de test). Sans mot de passe, ce test est SKIP (aucun secret committé ici).
 *
 * Cible : BASE_URL (def http://localhost:3000). Pour valider la prod déployée :
 *   BASE_URL=https://chemin-alliance.vercel.app NO_WEBSERVER=1 E2E_PASSWORD=… \
 *   npx playwright test e2e/games-flow.spec.ts
 */

const LOCALE = process.env.LOCALE ?? "fr";
const EMAIL = process.env.E2E_EMAIL ?? "mrkolosal+chemintest@gmail.com";
const PASSWORD = process.env.E2E_PASSWORD;

// Chaînes FR réelles utilisées comme ancres de sélection (messages/fr.json,
// namespace alliance_lab - inchangé par la reconnexion, seule la route et le
// point d'entrée profil sont nouveaux).
const LAB_TITLE = "Alliance Lab"; // alliance_lab.title
const CHOOSE_PARTNER = "Choisis ton partenaire d'entrainement"; // arena.choosePartner
const GAME_DISC = "Profil DISC"; // arena.gameDisc
const FINISH = "Terminer la partie"; // arena.finish
const NEXT = "Question suivante"; // arena.next
const SYNTHESIS_TITLE = "Synthese pastorale"; // arena.synthesisTitle

async function login(page: Page): Promise<void> {
  await page.goto(`/${LOCALE}/login`);
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD as string);
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.endsWith("/login"), {
    timeout: 20_000,
  });
}

test.describe("Mode jeu Alliance Lab (reconnecté)", () => {
  test.skip(
    !PASSWORD,
    "Définir E2E_PASSWORD pour exécuter ce test authentifié.",
  );

  test("profil -> games -> DISC -> synthèse pastorale", async ({ page }) => {
    await login(page);

    // 1) Point d'entrée discret : carte "Alliance Lab" sur /profile, pas
    // d'onglet BottomNav (choix produit assumé).
    await page.goto(`/${LOCALE}/profile`);
    const entry = page.getByRole("link", { name: new RegExp(LAB_TITLE) });
    await expect(entry).toBeVisible();
    await entry.click();
    await page.waitForURL(/\/games$/);

    // 2) Chooser : au moins une persona active affichée, chaque carte
    // propose DISC + Questions Profondes.
    await expect(page.getByText(CHOOSE_PARTNER)).toBeVisible();
    const firstDiscButton = page.getByRole("link", { name: GAME_DISC }).first();
    await expect(firstDiscButton).toBeVisible();
    await firstDiscButton.click();
    await page.waitForURL(/\/games\/play\?/);

    // 3) Arène DISC : répondre aux 5 questions (boutons D/I/S/C, pas de
    // textarea libre), attendre le retournement des 2 cartes (réponse LLM de
    // la persona), avancer jusqu'à la dernière question.
    for (let i = 0; i < 5; i++) {
      const optionButtons = page.locator(
        'main button[type="button"]:not(:has-text("Question suivante"))',
      );
      await optionButtons.first().click();

      // La carte utilisateur se retourne dès que les 2 réponses sont prêtes
      // (retournement simultané) - attend l'apparition du bouton suivant/fin.
      const nextOrFinish = page.getByRole("button", {
        name: new RegExp(`${NEXT}|${FINISH}`),
      });
      await expect(nextOrFinish).toBeVisible({ timeout: 30_000 });

      const isLast = i === 4;
      if (!isLast) {
        await page.getByRole("button", { name: NEXT }).click();
      } else {
        await page.getByRole("button", { name: new RegExp(FINISH) }).click();
      }
    }

    // 4) Synthèse pastorale finale (Pasteur IA) - pas un score, pas un
    // verdict, un texte narratif.
    await expect(page.getByText(SYNTHESIS_TITLE)).toBeVisible({
      timeout: 30_000,
    });
  });
});
