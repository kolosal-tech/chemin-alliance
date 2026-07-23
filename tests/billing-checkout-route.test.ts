import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  rateLimit: vi.fn(),
  createCheckout: vi.fn(),
}));

vi.mock("@/lib/security/session", () => ({
  requireUser: mocks.requireUser,
}));

vi.mock("@/lib/security/rate-limit", () => ({
  rateLimit: mocks.rateLimit,
}));

vi.mock("@/lib/env", () => ({
  env: { APP_URL: "https://alliance.example" },
}));

vi.mock("@/lib/payments/provider", () => ({
  paymentProvider: { createCheckout: mocks.createCheckout },
  stripeCheckoutEnabled: true,
}));

vi.mock("@/i18n/routing", () => ({
  routing: { locales: ["fr", "en", "es", "pt"], defaultLocale: "fr" },
}));

import { POST } from "@/app/api/billing/checkout/route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.rateLimit.mockResolvedValue({ allowed: true, remaining: 7 });
});

describe("POST /api/billing/checkout", () => {
  it("interdit le paiement avant vérification de l'adresse", async () => {
    mocks.requireUser.mockResolvedValue({
      id: "user-1",
      isVerified: false,
    });

    const response = await POST(
      new Request("https://alliance.example/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale: "fr" }),
      }),
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      error: "EMAIL_NOT_VERIFIED",
    });
    expect(mocks.rateLimit).not.toHaveBeenCalled();
    expect(mocks.createCheckout).not.toHaveBeenCalled();
  });
});
