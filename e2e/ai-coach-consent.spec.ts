import { hash } from "@node-rs/argon2";
import { PrismaClient } from "@prisma/client";
import { expect, test, type Page } from "@playwright/test";

const MANAGED_FIXTURES = process.env.E2E_MANAGED_FIXTURES === "1";
const EMAIL = "ai-consent-e2e@local.invalid";
const PASSWORD = "AiConsent-E2E-2026!";
const LOCALES = ["fr", "en", "es", "pt"] as const;
const prisma = new PrismaClient();

function assertDisposableLocalDatabase(): void {
  const raw = process.env.DATABASE_URL;
  if (!MANAGED_FIXTURES || !raw) {
    throw new Error("E2E_MANAGED_FIXTURES_AND_DATABASE_URL_REQUIRED");
  }
  const url = new URL(raw);
  if (!["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)) {
    throw new Error("REFUSING_NON_LOCAL_E2E_DATABASE");
  }
  if (process.env.AI_PROVIDER !== "fallback") {
    throw new Error("REFUSING_E2E_WITH_EXTERNAL_AI_PROVIDER");
  }
}

async function login(page: Page): Promise<void> {
  // Une IP documentaire dédiée évite que ce fixture partage le quota de login
  // des autres scénarios tout en ne représentant aucune adresse réelle.
  await page.setExtraHTTPHeaders({ "x-forwarded-for": "203.0.113.200" });
  await page.goto("/fr/login");
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD);
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.endsWith("/login"));
}

test.describe("AI Coach consent — fixture isolé", () => {
  test.skip(
    !MANAGED_FIXTURES,
    "Définir E2E_MANAGED_FIXTURES=1 sur une base locale jetable.",
  );

  test.beforeAll(async () => {
    assertDisposableLocalDatabase();
    const passwordHash = await hash(PASSWORD, {
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });
    await prisma.user.deleteMany({ where: { email: EMAIL } });
    await prisma.user.create({
      data: {
        email: EMAIL,
        passwordHash,
        displayName: "Consent E2E",
        age: 30,
        locale: "fr",
        isVerified: true,
        privacySettings: { create: {} },
        consents: { create: { type: "SENSITIVE_DATA_PROCESSING" } },
      },
    });
  });

  test.beforeEach(async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: EMAIL },
      select: { id: true },
    });
    await prisma.$transaction([
      prisma.coachMessage.deleteMany({ where: { userId: user.id } }),
      prisma.aiCoachUsage.deleteMany({ where: { userId: user.id } }),
      prisma.consent.deleteMany({
        where: { userId: user.id, type: "AI_COACH_INTERACTION" },
      }),
    ]);
  });

  test.afterAll(async () => {
    if (MANAGED_FIXTURES) {
      await prisma.user.deleteMany({ where: { email: EMAIL } });
    }
    await prisma.$disconnect();
  });

  test("visible sans overflow dans 4 langues, octroi sans body, retrait et verrou serveur", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await login(page);

    for (const locale of LOCALES) {
      await page.goto(`/${locale}/coach-ai`);
      const card = page.getByTestId("ai-coach-consent-card");
      const input = page.getByTestId("ai-coach-input");
      await expect(card).toBeVisible();
      await expect(card).toContainText(
        /configuration|configuración|configuração/i,
      );
      await expect(input).toBeDisabled();

      const overflow = await card.evaluate((element) => {
        const box = element.getBoundingClientRect();
        return {
          document: document.documentElement.scrollWidth - window.innerWidth,
          card: element.scrollWidth - element.clientWidth,
          left: box.left,
          right: box.right - window.innerWidth,
        };
      });
      expect(overflow.document).toBeLessThanOrEqual(1);
      expect(overflow.card).toBeLessThanOrEqual(1);
      expect(overflow.left).toBeGreaterThanOrEqual(-1);
      expect(overflow.right).toBeLessThanOrEqual(1);
    }

    await page.goto("/fr/coach-ai");
    const origin = new URL(page.url()).origin;
    const preConsent = await page.request.post("/api/ai-coach/message", {
      headers: { origin },
      data: { question: "Question avant accord", mode: "individual" },
    });
    expect(preConsent.status()).toBe(403);
    expect(await preConsent.json()).toMatchObject({
      error: "AI_COACH_CONSENT_REQUIRED",
    });

    const grantRequestPromise = page.waitForRequest(
      (request) =>
        request.url().endsWith("/api/me/consents/ai-coach") &&
        request.method() === "POST",
    );
    await page.getByTestId("ai-coach-consent-grant").click();
    const grantRequest = await grantRequestPromise;
    expect([null, ""]).toContain(grantRequest.postData());
    await expect(page.getByTestId("ai-coach-input")).toBeEnabled();
    await expect(page.getByTestId("ai-coach-consent-revoke")).toBeVisible();

    const messageResponsePromise = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/ai-coach/message") &&
        response.request().method() === "POST",
    );
    await page
      .getByTestId("ai-coach-input")
      .fill("Comment mieux écouter avec patience ?");
    await page.getByTestId("ai-coach-send").click();
    expect((await messageResponsePromise).status()).toBe(200);
    await expect(
      page.getByText("Comment mieux écouter avec patience ?"),
    ).toBeVisible();

    const revokeResponsePromise = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/me/consents/ai-coach") &&
        response.request().method() === "DELETE",
    );
    await page.getByTestId("ai-coach-consent-revoke").click();
    expect((await revokeResponsePromise).status()).toBe(200);
    await expect(page.getByTestId("ai-coach-input")).toBeDisabled();

    const state = await page.request.get("/api/me/consents/ai-coach");
    expect(state.status()).toBe(200);
    expect(await state.json()).toMatchObject({ active: false });

    const afterWithdrawal = await page.request.post("/api/ai-coach/message", {
      headers: { origin },
      data: { question: "Question après retrait", mode: "individual" },
    });
    expect(afterWithdrawal.status()).toBe(403);
    expect(await afterWithdrawal.json()).toMatchObject({
      error: "AI_COACH_CONSENT_REQUIRED",
    });
  });
});
