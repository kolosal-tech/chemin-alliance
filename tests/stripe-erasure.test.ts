import { describe, expect, it, vi } from "vitest";
import {
  eraseStripeCustomer,
  StripeCustomerErasureError,
  stripeSecretLivemode,
  type StripeCustomerErasureClient,
} from "@/lib/payments/stripe-erasure";

function setup(
  current: unknown = {
    id: "cus_1",
    object: "customer",
    livemode: false,
  },
  deleted: unknown = {
    id: "cus_1",
    object: "customer",
    deleted: true,
  },
) {
  const retrieve = vi.fn().mockResolvedValue(current);
  const remove = vi.fn().mockResolvedValue(deleted);
  const client: StripeCustomerErasureClient = {
    retrieve,
    delete: remove,
  };
  return { client, retrieve, remove };
}

describe("effacement du Customer Stripe", () => {
  it("est un no-op sûr quand aucun Customer n'est lié", async () => {
    await expect(eraseStripeCustomer(null, null, null)).resolves.toBe(
      "NOT_LINKED",
    );
  });

  it("échoue fermé si un lien existe mais Stripe n'est pas disponible", async () => {
    await expect(
      eraseStripeCustomer("cus_1", null, false),
    ).rejects.toMatchObject({
      code: "STRIPE_ERASURE_UNAVAILABLE",
    });
  });

  it("reconnaît strictement les clés test/live et restricted", () => {
    expect(stripeSecretLivemode("sk_test_example")).toBe(false);
    expect(stripeSecretLivemode("rk_test_example")).toBe(false);
    expect(stripeSecretLivemode("sk_live_example")).toBe(true);
    expect(stripeSecretLivemode("rk_live_example")).toBe(true);
    expect(stripeSecretLivemode("invalid")).toBeNull();
    expect(stripeSecretLivemode(undefined)).toBeNull();
  });

  it("confirme la suppression avant de réussir et utilise une clé idempotente stable", async () => {
    const { client, retrieve, remove } = setup();
    await expect(eraseStripeCustomer("cus_1", client, false)).resolves.toBe(
      "DELETED",
    );
    expect(retrieve).toHaveBeenCalledWith("cus_1");
    expect(remove).toHaveBeenCalledWith(
      "cus_1",
      "chemin-alliance:erase-customer:cus_1",
    );
  });

  it("est idempotent après une suppression Stripe déjà réussie", async () => {
    const { client, remove } = setup({
      id: "cus_1",
      object: "customer",
      deleted: true,
    });
    await expect(eraseStripeCustomer("cus_1", client, false)).resolves.toBe(
      "ALREADY_DELETED",
    );
    expect(remove).not.toHaveBeenCalled();
  });

  it("résiste à un retry après succès distant et échec local", async () => {
    const { client, retrieve, remove } = setup();
    retrieve
      .mockResolvedValueOnce({
        id: "cus_1",
        object: "customer",
        livemode: false,
      })
      .mockResolvedValueOnce({
        id: "cus_1",
        object: "customer",
        deleted: true,
      });
    await expect(eraseStripeCustomer("cus_1", client, false)).resolves.toBe(
      "DELETED",
    );
    await expect(eraseStripeCustomer("cus_1", client, false)).resolves.toBe(
      "ALREADY_DELETED",
    );
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it("refuse un Customer d'un autre mode Stripe", async () => {
    const { client, remove } = setup({
      id: "cus_1",
      object: "customer",
      livemode: true,
    });
    await expect(
      eraseStripeCustomer("cus_1", client, false),
    ).rejects.toMatchObject({
      code: "STRIPE_CUSTOMER_MODE_MISMATCH",
    });
    expect(remove).not.toHaveBeenCalled();
  });

  it.each([
    [{ id: "cus_other", object: "customer", livemode: false }],
    [{ id: "cus_1", object: "subscription", livemode: false }],
    [null],
  ])("refuse une relecture Customer ambiguë : %j", async (current) => {
    const { client, remove } = setup(current);
    await expect(
      eraseStripeCustomer("cus_1", client, false),
    ).rejects.toMatchObject({
      code: "STRIPE_CUSTOMER_INVALID",
    });
    expect(remove).not.toHaveBeenCalled();
  });

  it.each([
    [{ id: "cus_1", object: "customer", deleted: false }],
    [{ id: "cus_other", object: "customer", deleted: true }],
    [null],
  ])("refuse une confirmation de suppression ambiguë : %j", async (result) => {
    const { client } = setup(undefined, result);
    await expect(
      eraseStripeCustomer("cus_1", client, false),
    ).rejects.toMatchObject({
      code: "STRIPE_DELETE_NOT_CONFIRMED",
    });
  });

  it("propage une panne Stripe sans la transformer en succès", async () => {
    const { client, retrieve } = setup();
    const outage = new Error("network outage");
    retrieve.mockRejectedValue(outage);
    await expect(eraseStripeCustomer("cus_1", client, false)).rejects.toBe(
      outage,
    );
  });

  it("expose des erreurs métier sans donnée Customer dans leur message", () => {
    expect(
      new StripeCustomerErasureError("STRIPE_DELETE_NOT_CONFIRMED").message,
    ).toBe("STRIPE_DELETE_NOT_CONFIRMED");
  });
});
