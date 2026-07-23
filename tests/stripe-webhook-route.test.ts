import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  constructEvent: vi.fn(),
  reconcile: vi.fn(),
  findUnique: vi.fn(),
  updateMany: vi.fn(),
}));

vi.mock("stripe", () => ({
  default: class StripeMock {
    webhooks = { constructEvent: mocks.constructEvent };
  },
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: mocks.findUnique,
      updateMany: mocks.updateMany,
    },
  },
}));

vi.mock("@/lib/payments/stripe-webhook", () => ({
  reconcileStripeBillingEvent: mocks.reconcile,
}));

const savedEnv = {
  secret: process.env.STRIPE_SECRET_KEY,
  webhook: process.env.STRIPE_WEBHOOK_SECRET,
  price: process.env.STRIPE_PRICE_PREMIUM,
};

async function loadRoute() {
  vi.resetModules();
  return import("@/app/api/webhooks/stripe/route");
}

describe("POST /api/webhooks/stripe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = "sk_test_example";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_example";
    process.env.STRIPE_PRICE_PREMIUM = "price_premium";
    mocks.constructEvent.mockReturnValue({
      id: "evt_1",
      type: "customer.subscription.updated",
      livemode: false,
      data: { object: { id: "sub_1" } },
    });
    mocks.reconcile.mockResolvedValue({
      applied: false,
      reason: "UNCHANGED",
      status: "active",
    });
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

  it("vérifie la signature sur le corps brut avant toute réconciliation", async () => {
    const { POST } = await loadRoute();
    const response = await POST(
      new Request("https://app.test/api/webhooks/stripe", {
        method: "POST",
        headers: { "stripe-signature": "t=1,v1=signed" },
        body: '{"id":"evt_1"}',
      }),
    );
    expect(response.status).toBe(200);
    expect(mocks.constructEvent).toHaveBeenCalledWith(
      '{"id":"evt_1"}',
      "t=1,v1=signed",
      "whsec_example",
    );
    expect(mocks.reconcile).toHaveBeenCalledWith(
      expect.objectContaining({ id: "evt_1" }),
      expect.anything(),
      expect.anything(),
      "price_premium",
    );
    await expect(response.json()).resolves.toMatchObject({
      received: true,
      reason: "UNCHANGED",
    });
  });

  it("rejette une signature invalide sans toucher au droit Premium", async () => {
    mocks.constructEvent.mockImplementation(() => {
      throw new Error("bad signature");
    });
    const { POST } = await loadRoute();
    const response = await POST(
      new Request("https://app.test/api/webhooks/stripe", {
        method: "POST",
        body: "{}",
      }),
    );
    expect(response.status).toBe(400);
    expect(mocks.reconcile).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      error: "BAD_SIGNATURE",
    });
  });

  it("renvoie 500 sur panne Stripe/DB afin que Stripe relivre l'événement", async () => {
    mocks.reconcile.mockRejectedValue(new Error("temporary outage"));
    const { POST } = await loadRoute();
    const response = await POST(
      new Request("https://app.test/api/webhooks/stripe", {
        method: "POST",
        headers: { "stripe-signature": "signed" },
        body: "{}",
      }),
    );
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "WEBHOOK_PROCESSING_FAILED",
    });
  });

  it("reste désactivé si le prix Premium exact n'est pas configuré", async () => {
    delete process.env.STRIPE_PRICE_PREMIUM;
    const { POST } = await loadRoute();
    const response = await POST(
      new Request("https://app.test/api/webhooks/stripe", {
        method: "POST",
        body: "{}",
      }),
    );
    expect(response.status).toBe(503);
    expect(mocks.constructEvent).not.toHaveBeenCalled();
    expect(mocks.reconcile).not.toHaveBeenCalled();
  });
});
