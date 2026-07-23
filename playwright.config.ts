import { defineConfig, devices } from "@playwright/test";

// Config dediee a l'audit Chemin d'Alliance.
// - testDir e2e/ : isole du runner vitest (tests/**.test.ts).
// - reporter json : consomme par scripts/generate-summary.mjs -> rapport HTML.
// - viewport mobile par defaut (iPhone/Pixel ~ 390x844), demande du brief.
const BASE_URL =
  process.env.BASE_URL ?? process.env.APP_URL ?? "http://127.0.0.1:3000";
const IS_CI = Boolean(process.env.CI);
const CROSS_BROWSER_TESTS = /(?:glass-ui|couple-settings-glass)\.spec\.ts$/;

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./test-results/artifacts",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: IS_CI,
  retries: 0,
  reporter: [
    ["list"],
    ["json", { outputFile: "test-results/results.json" }],
    ["html", { outputFolder: "test-results/html", open: "never" }],
  ],
  use: {
    baseURL: BASE_URL,
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    locale: "fr-FR",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 5"], viewport: { width: 390, height: 844 } },
    },
    {
      name: "mobile-firefox",
      testMatch: CROSS_BROWSER_TESTS,
      use: {
        ...devices["Desktop Firefox"],
        viewport: { width: 390, height: 844 },
        isMobile: false,
        hasTouch: false,
      },
    },
    {
      name: "mobile-webkit",
      testMatch: CROSS_BROWSER_TESTS,
      use: {
        ...devices["iPhone 13"],
        viewport: { width: 390, height: 844 },
      },
    },
  ],
  // Teste le bundle Next de production lorsque la cible est locale. Désactiver
  // le serveur seulement pour une cible externe déjà démarrée.
  webServer: process.env.NO_WEBSERVER
    ? undefined
    : {
        command: IS_CI ? "pnpm build && pnpm start" : "pnpm dev",
        url: BASE_URL,
        timeout: 240_000,
        reuseExistingServer: !IS_CI,
      },
});
