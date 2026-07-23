import type Stripe from "stripe";
import { describe, expect, it, vi } from "vitest";
import {
  reconcileStripeBillingEvent,
  type StripeBillingClient,
  type StripeBillingStore,
} from "@/lib/payments/stripe-webhook";

const PRICE_ID = "price_premium";
const PRODUCT_ID = "prod_premium";

function event(
  type: Stripe.Event.Type,
  object: Record<string, unknown>,
  livemode = false,
): Stripe.Event {
  return {
    id: "evt_1",
    object: "event",
    api_version: "2026-06-30.basil",
    created: 1,
    data: { object },
    livemode,
    pending_webhooks: 0,
    request: null,
    type,
  } as unknown as Stripe.Event;
}

function premiumItem(
  priceId = PRICE_ID,
  productId = PRODUCT_ID,
): Record<string, unknown> {
  return {
    quantity: 1,
    price: { id: priceId, product: { id: productId } },
  };
}

function subscription(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: "sub_1",
    livemode: false,
    customer: "cus_1",
    status: "active",
    metadata: { userId: "user_1" },
    items: { data: [premiumItem()] },
    latest_invoice: { status: "paid", amount_due: 999 },
    ...overrides,
  };
}

function checkout(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: "cs_1",
    livemode: false,
    mode: "subscription",
    status: "complete",
    payment_status: "paid",
    customer: "cus_1",
    subscription: "sub_1",
    client_reference_id: "user_1",
    metadata: { userId: "user_1" },
    line_items: { data: [premiumItem()] },
    ...overrides,
  };
}

function setup(options?: {
  checkout?: Record<string, unknown>;
  subscriptions?: Record<string, unknown>[];
  localStatus?: string | null;
  localUserId?: string;
  catalog?: Record<string, unknown>;
}) {
  const client: StripeBillingClient = {
    prices: {
      retrieve: vi.fn().mockResolvedValue(
        options?.catalog ?? {
          id: PRICE_ID,
          type: "recurring",
          recurring: { interval: "month" },
          livemode: false,
          product: { id: PRODUCT_ID, active: true },
        },
      ),
    },
    checkout: {
      sessions: {
        retrieve: vi.fn().mockResolvedValue(options?.checkout ?? checkout()),
      },
    },
    subscriptions: {
      list: vi.fn().mockResolvedValue({
        data: options?.subscriptions ?? [subscription()],
      }),
    },
  };
  const setStatus = vi.fn().mockResolvedValue(true);
  const store: StripeBillingStore = {
    findByCustomerId: vi.fn().mockResolvedValue({
      id: options?.localUserId ?? "user_1",
      subscriptionStatus: options?.localStatus ?? null,
    }),
    setStatus,
  };
  return { client, store, setStatus };
}

describe("Stripe webhook reconciliation", () => {
  it("ignore les événements hors abonnement sans appeler Stripe", async () => {
    const { client, store } = setup();
    const result = await reconcileStripeBillingEvent(
      event("invoice.created", { id: "in_1" }),
      client,
      store,
      PRICE_ID,
    );
    expect(result).toEqual({
      applied: false,
      reason: "UNSUPPORTED_EVENT",
    });
    expect(client.prices.retrieve).not.toHaveBeenCalled();
  });

  it("active uniquement un checkout complet, payé et rattaché au SKU exact", async () => {
    const { client, store, setStatus } = setup();
    const result = await reconcileStripeBillingEvent(
      event("checkout.session.completed", { id: "cs_1" }),
      client,
      store,
      PRICE_ID,
    );
    expect(result).toEqual({
      applied: true,
      reason: "UPDATED",
      status: "active",
    });
    expect(client.checkout.sessions.retrieve).toHaveBeenCalledWith("cs_1", {
      expand: ["line_items.data.price.product", "subscription"],
    });
    expect(client.subscriptions.list).toHaveBeenCalledWith({
      customer: "cus_1",
      status: "all",
      limit: 100,
      expand: ["data.items.data.price.product", "data.latest_invoice"],
    });
    expect(setStatus).toHaveBeenCalledWith("user_1", "cus_1", "active");
  });

  it.each([
    ["paiement incomplet", { payment_status: "unpaid" }],
    ["mode paiement unique", { mode: "payment" }],
    ["référence client divergente", { client_reference_id: "attacker" }],
    ["prix différent", { line_items: { data: [premiumItem("price_other")] } }],
    [
      "produit différent",
      { line_items: { data: [premiumItem(PRICE_ID, "prod_other")] } },
    ],
    [
      "quantité absente",
      {
        line_items: {
          data: [
            {
              price: { id: PRICE_ID, product: { id: PRODUCT_ID } },
            },
          ],
        },
      },
    ],
    [
      "quantité supérieure à un",
      {
        line_items: {
          data: [
            {
              quantity: 2,
              price: { id: PRICE_ID, product: { id: PRODUCT_ID } },
            },
          ],
        },
      },
    ],
    ["abonnement absent", { subscription: null }],
  ])("refuse un checkout invalide : %s", async (_label, overrides) => {
    const { client, store, setStatus } = setup({
      checkout: checkout(overrides),
    });
    const result = await reconcileStripeBillingEvent(
      event("checkout.session.completed", { id: "cs_1" }),
      client,
      store,
      PRICE_ID,
    );
    expect(result.reason).toBe("INVALID_CHECKOUT");
    expect(client.subscriptions.list).not.toHaveBeenCalled();
    expect(setStatus).not.toHaveBeenCalled();
  });

  it("refuse le mélange test/live et un catalogue non récurrent", async () => {
    const wrongMode = setup();
    expect(
      await reconcileStripeBillingEvent(
        event("checkout.session.completed", { id: "cs_1" }, true),
        wrongMode.client,
        wrongMode.store,
        PRICE_ID,
      ),
    ).toMatchObject({ reason: "INVALID_CATALOG" });

    const invalidCatalog = setup({
      catalog: {
        id: PRICE_ID,
        type: "one_time",
        livemode: false,
        product: { id: PRODUCT_ID },
      },
    });
    expect(
      await reconcileStripeBillingEvent(
        event("checkout.session.completed", { id: "cs_1" }),
        invalidCatalog.client,
        invalidCatalog.store,
        PRICE_ID,
      ),
    ).toMatchObject({ reason: "INVALID_CATALOG" });
  });

  it("ne rattache jamais un customer Stripe à un autre utilisateur", async () => {
    const { client, store, setStatus } = setup({
      localUserId: "victim",
    });
    const result = await reconcileStripeBillingEvent(
      event("checkout.session.completed", { id: "cs_1" }),
      client,
      store,
      PRICE_ID,
    );
    expect(result.reason).toBe("CUSTOMER_MISMATCH");
    expect(client.subscriptions.list).not.toHaveBeenCalled();
    expect(setStatus).not.toHaveBeenCalled();
  });

  it("ignore un customer Stripe inconnu localement", async () => {
    const { client, store, setStatus } = setup();
    vi.mocked(store.findByCustomerId).mockResolvedValue(null);
    const result = await reconcileStripeBillingEvent(
      event("checkout.session.completed", { id: "cs_1" }),
      client,
      store,
      PRICE_ID,
    );
    expect(result.reason).toBe("UNKNOWN_CUSTOMER");
    expect(client.subscriptions.list).not.toHaveBeenCalled();
    expect(setStatus).not.toHaveBeenCalled();
  });

  it("refuse un événement subscription portant un autre prix", async () => {
    const { client, store, setStatus } = setup();
    const result = await reconcileStripeBillingEvent(
      event(
        "customer.subscription.updated",
        subscription({
          items: { data: [premiumItem("price_attacker")] },
        }),
      ),
      client,
      store,
      PRICE_ID,
    );
    expect(result.reason).toBe("INVALID_SUBSCRIPTION");
    expect(client.subscriptions.list).not.toHaveBeenCalled();
    expect(setStatus).not.toHaveBeenCalled();
  });

  it("recalcule l'état courant : un ancien événement deleted ne désactive pas un abonnement actif", async () => {
    const { client, store, setStatus } = setup({
      localStatus: "active",
      subscriptions: [subscription()],
    });
    const result = await reconcileStripeBillingEvent(
      event(
        "customer.subscription.deleted",
        subscription({ status: "canceled" }),
      ),
      client,
      store,
      PRICE_ID,
    );
    expect(result).toEqual({
      applied: false,
      reason: "UNCHANGED",
      status: "active",
    });
    expect(setStatus).not.toHaveBeenCalled();
  });

  it("désactive quand aucun abonnement Premium courant n'est payé", async () => {
    const { client, store, setStatus } = setup({
      localStatus: "active",
      subscriptions: [
        subscription({
          latest_invoice: { status: "open", amount_due: 999 },
        }),
        subscription({
          status: "active",
          items: { data: [premiumItem("price_other", "prod_other")] },
        }),
      ],
    });
    const result = await reconcileStripeBillingEvent(
      event("customer.subscription.updated", subscription()),
      client,
      store,
      PRICE_ID,
    );
    expect(result.status).toBe("none");
    expect(setStatus).toHaveBeenCalledWith("user_1", "cus_1", "none");
  });

  it("parcourt toutes les pages avant de conclure sur le droit Premium", async () => {
    const { client, store, setStatus } = setup();
    vi.mocked(client.subscriptions.list)
      .mockResolvedValueOnce({
        data: [
          subscription({
            id: "sub_old",
            status: "canceled",
            latest_invoice: { status: "paid" },
          }),
        ],
        has_more: true,
      })
      .mockResolvedValueOnce({
        data: [subscription({ id: "sub_current" })],
        has_more: false,
      });
    const result = await reconcileStripeBillingEvent(
      event("customer.subscription.updated", subscription()),
      client,
      store,
      PRICE_ID,
    );
    expect(result.status).toBe("active");
    expect(client.subscriptions.list).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ starting_after: "sub_old" }),
    );
    expect(setStatus).toHaveBeenCalledWith("user_1", "cus_1", "active");
  });

  it("accepte un essai Stripe courant sans facture payée", async () => {
    const { client, store, setStatus } = setup({
      subscriptions: [
        subscription({ status: "trialing", latest_invoice: null }),
      ],
    });
    const result = await reconcileStripeBillingEvent(
      event(
        "customer.subscription.created",
        subscription({ status: "trialing" }),
      ),
      client,
      store,
      PRICE_ID,
    );
    expect(result.status).toBe("active");
    expect(setStatus).toHaveBeenCalledWith("user_1", "cus_1", "active");
  });

  it("tolère les anciens abonnements sans metadata uniquement via le customer déjà lié", async () => {
    const { client, store, setStatus } = setup({
      subscriptions: [],
      localStatus: "active",
    });
    const result = await reconcileStripeBillingEvent(
      event("customer.subscription.deleted", subscription({ metadata: {} })),
      client,
      store,
      PRICE_ID,
    );
    expect(result.status).toBe("none");
    expect(setStatus).toHaveBeenCalledWith("user_1", "cus_1", "none");
  });
});
