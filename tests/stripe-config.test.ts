import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const savedEnv = {
  secret: process.env.STRIPE_SECRET_KEY,
  webhook: process.env.STRIPE_WEBHOOK_SECRET,
  price: process.env.STRIPE_PRICE_PREMIUM,
};

async function flags() {
  vi.resetModules();
  const provider = await import("@/lib/payments/provider");
  return {
    stripeEnabled: provider.stripeEnabled,
    stripeCheckoutEnabled: provider.stripeCheckoutEnabled,
  };
}

describe("configuration Stripe", () => {
  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = "sk_test_example";
    process.env.STRIPE_PRICE_PREMIUM = "price_premium";
    delete process.env.STRIPE_WEBHOOK_SECRET;
  });

  afterAll(() => {
    if (savedEnv.secret === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = savedEnv.secret;
    if (savedEnv.webhook === undefined) {
      delete process.env.STRIPE_WEBHOOK_SECRET;
    } else process.env.STRIPE_WEBHOOK_SECRET = savedEnv.webhook;
    if (savedEnv.price === undefined) delete process.env.STRIPE_PRICE_PREMIUM;
    else process.env.STRIPE_PRICE_PREMIUM = savedEnv.price;
  });

  it("interdit un nouveau paiement si le webhook est absent", async () => {
    await expect(flags()).resolves.toEqual({
      stripeEnabled: true,
      stripeCheckoutEnabled: false,
    });
  });

  it("autorise le checkout seulement quand les trois secrets sont présents", async () => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_example";
    await expect(flags()).resolves.toEqual({
      stripeEnabled: true,
      stripeCheckoutEnabled: true,
    });
  });
});
