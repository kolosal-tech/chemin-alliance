import { defineConfig, devices } from "@playwright/test";

// Config dediee a l'audit Chemin d'Alliance.
// - testDir e2e/ : isole du runner vitest (tests/**.test.ts).
// - reporter json : consomme par scripts/generate-summary.js -> rapport HTML.
// - viewport mobile par defaut (iPhone/Pixel ~ 390x844), demande du brief.
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./test-results/artifacts",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
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
  ],
  // Lance le serveur Next si BASE_URL pointe en local. Desactive si tu vises la
  // prod (BASE_URL=https://chemin-alliance.vercel.app) ou un serveur deja lance.
  webServer: process.env.NO_WEBSERVER
    ? undefined
    : {
        command: "pnpm dev",
        url: BASE_URL,
        timeout: 120_000,
        reuseExistingServer: true,
      },
});
