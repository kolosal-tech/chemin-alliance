import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({ prisma: db }));

import { StripePaymentProvider } from "@/lib/payments/provider";

function providerWith(stripe: Record<string, unknown>) {
  const provider = new StripePaymentProvider("sk_test_example", "price_1");
  Object.assign(provider as unknown as { stripe: unknown }, { stripe });
  return provider;
}

describe("StripePaymentProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("crée un customer de façon idempotente et propage l'identité à l'abonnement", async () => {
    db.user.findUnique.mockResolvedValue({
      stripeCustomerId: null,
      email: "user@example.test",
    });
    db.user.update.mockResolvedValue({ id: "user_1" });
    const customersCreate = vi.fn().mockResolvedValue({ id: "cus_1" });
    const sessionsCreate = vi.fn().mockResolvedValue({
      id: "cs_1",
      url: "https://checkout.stripe.test/cs_1",
    });
    const provider = providerWith({
      customers: { create: customersCreate },
      checkout: { sessions: { create: sessionsCreate } },
    });

    await expect(
      provider.createCheckout({
        userId: "user_1",
        successUrl: "https://app.test/success",
        cancelUrl: "https://app.test/cancel",
      }),
    ).resolves.toEqual({
      id: "cs_1",
      url: "https://checkout.stripe.test/cs_1",
      status: "open",
    });

    expect(customersCreate).toHaveBeenCalledWith(
      {
        email: "user@example.test",
        metadata: { userId: "user_1" },
      },
      { idempotencyKey: "chemin-alliance:customer:user_1" },
    );
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: { stripeCustomerId: "cus_1" },
    });
    expect(sessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "subscription",
        customer: "cus_1",
        line_items: [{ price: "price_1", quantity: 1 }],
        client_reference_id: "user_1",
        metadata: { userId: "user_1" },
        subscription_data: { metadata: { userId: "user_1" } },
      }),
    );
  });

  it("réutilise le customer local existant", async () => {
    db.user.findUnique.mockResolvedValue({
      stripeCustomerId: "cus_existing",
      email: "user@example.test",
    });
    const customersCreate = vi.fn();
    const sessionsCreate = vi.fn().mockResolvedValue({
      id: "cs_1",
      url: "https://checkout.stripe.test/cs_1",
    });
    const provider = providerWith({
      customers: { create: customersCreate },
      checkout: { sessions: { create: sessionsCreate } },
    });

    await provider.createCheckout({
      userId: "user_1",
      successUrl: "https://app.test/success",
      cancelUrl: "https://app.test/cancel",
    });
    expect(customersCreate).not.toHaveBeenCalled();
    expect(db.user.update).not.toHaveBeenCalled();
    expect(sessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_existing" }),
    );
  });

  it("échoue fermé si l'utilisateur n'existe pas", async () => {
    db.user.findUnique.mockResolvedValue(null);
    const customersCreate = vi.fn();
    const provider = providerWith({
      customers: { create: customersCreate },
      checkout: { sessions: { create: vi.fn() } },
    });
    await expect(
      provider.createCheckout({
        userId: "missing",
        successUrl: "https://app.test/success",
        cancelUrl: "https://app.test/cancel",
      }),
    ).rejects.toThrow("USER_NOT_FOUND");
    expect(customersCreate).not.toHaveBeenCalled();
  });

  it("n'invente jamais une URL de checkout si Stripe n'en retourne pas", async () => {
    db.user.findUnique.mockResolvedValue({
      stripeCustomerId: "cus_existing",
      email: "user@example.test",
    });
    const provider = providerWith({
      customers: { create: vi.fn() },
      checkout: {
        sessions: { create: vi.fn().mockResolvedValue({ id: "cs_1" }) },
      },
    });
    await expect(
      provider.createCheckout({
        userId: "user_1",
        successUrl: "https://app.test/success",
        cancelUrl: "https://app.test/cancel",
      }),
    ).rejects.toThrow("STRIPE_CHECKOUT_URL_MISSING");
  });

  it("refuse une URL de checkout hors Stripe", async () => {
    db.user.findUnique.mockResolvedValue({
      stripeCustomerId: "cus_existing",
      email: "user@example.test",
    });
    const provider = providerWith({
      customers: { create: vi.fn() },
      checkout: {
        sessions: {
          create: vi.fn().mockResolvedValue({
            id: "cs_1",
            url: "https://evil.example/phishing",
          }),
        },
      },
    });

    await expect(
      provider.createCheckout({
        userId: "user_1",
        successUrl: "https://app.test/success",
        cancelUrl: "https://app.test/cancel",
      }),
    ).rejects.toThrow("STRIPE_CHECKOUT_URL_INVALID");
  });
});
