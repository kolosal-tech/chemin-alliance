import Stripe from "stripe";

export type StripeCustomerErasureResult =
  | "NOT_LINKED"
  | "ALREADY_DELETED"
  | "DELETED";

export type StripeCustomerErasureClient = {
  retrieve(customerId: string): Promise<unknown>;
  delete(customerId: string, idempotencyKey: string): Promise<unknown>;
};

export class StripeCustomerErasureError extends Error {
  constructor(
    readonly code:
      | "STRIPE_ERASURE_UNAVAILABLE"
      | "STRIPE_CUSTOMER_INVALID"
      | "STRIPE_CUSTOMER_MODE_MISMATCH"
      | "STRIPE_DELETE_NOT_CONFIRMED",
  ) {
    super(code);
    this.name = "StripeCustomerErasureError";
  }
}

type RecordValue = Record<string, unknown>;

function record(value: unknown): RecordValue | null {
  return value !== null && typeof value === "object"
    ? (value as RecordValue)
    : null;
}

/**
 * Supprime le Customer Stripe lié au compte.
 *
 * Stripe annule immédiatement les abonnements lors de cette opération, retire
 * les moyens de paiement et conserve l'objet supprimé récupérable pour la
 * traçabilité comptable. On ne tente donc pas de supprimer factures ou charges.
 *
 * La relecture préalable rend un retry sûr si Stripe a réussi mais que la
 * suppression locale ou le réseau a échoué juste après. Toute réponse ambiguë
 * échoue fermée et interdit la pseudonymisation locale.
 */
export async function eraseStripeCustomer(
  customerId: string | null | undefined,
  client: StripeCustomerErasureClient | null,
  expectedLivemode: boolean | null,
): Promise<StripeCustomerErasureResult> {
  if (!customerId) return "NOT_LINKED";
  if (!client || expectedLivemode === null) {
    throw new StripeCustomerErasureError("STRIPE_ERASURE_UNAVAILABLE");
  }

  const current = record(await client.retrieve(customerId));
  if (
    current?.id !== customerId ||
    (current.object !== undefined && current.object !== "customer")
  ) {
    throw new StripeCustomerErasureError("STRIPE_CUSTOMER_INVALID");
  }
  if (current.deleted === true) return "ALREADY_DELETED";
  if (current.livemode !== expectedLivemode) {
    throw new StripeCustomerErasureError("STRIPE_CUSTOMER_MODE_MISMATCH");
  }

  const deleted = record(
    await client.delete(
      customerId,
      `chemin-alliance:erase-customer:${customerId}`,
    ),
  );
  if (deleted?.id !== customerId || deleted.deleted !== true) {
    throw new StripeCustomerErasureError("STRIPE_DELETE_NOT_CONFIRMED");
  }
  return "DELETED";
}

export function stripeSecretLivemode(
  secret: string | undefined,
): boolean | null {
  if (!secret) return null;
  if (secret.startsWith("sk_live_") || secret.startsWith("rk_live_")) {
    return true;
  }
  if (secret.startsWith("sk_test_") || secret.startsWith("rk_test_")) {
    return false;
  }
  return null;
}

const secret = process.env.STRIPE_SECRET_KEY;
const stripe = secret ? new Stripe(secret) : null;
const client: StripeCustomerErasureClient | null = stripe
  ? {
      retrieve: (customerId) => stripe.customers.retrieve(customerId),
      delete: (customerId, idempotencyKey) =>
        stripe.customers.del(
          customerId,
          {},
          {
            idempotencyKey,
          },
        ),
    }
  : null;

/** Adaptateur de production utilisé par la route d'effacement de compte. */
export async function eraseLinkedStripeCustomer(
  customerId: string | null | undefined,
): Promise<StripeCustomerErasureResult> {
  return eraseStripeCustomer(customerId, client, stripeSecretLivemode(secret));
}
