import type Stripe from "stripe";

export type LocalBillingUser = {
  id: string;
  subscriptionStatus: string | null;
};

export interface StripeBillingStore {
  findByCustomerId(customerId: string): Promise<LocalBillingUser | null>;
  setStatus(
    userId: string,
    customerId: string,
    status: "active" | "none",
  ): Promise<boolean>;
}

export interface StripeBillingClient {
  prices: {
    retrieve(priceId: string, params: { expand: string[] }): Promise<unknown>;
  };
  checkout: {
    sessions: {
      retrieve(
        sessionId: string,
        params: { expand: string[] },
      ): Promise<unknown>;
    };
  };
  subscriptions: {
    list(params: {
      customer: string;
      status: "all";
      limit: number;
      expand: string[];
      starting_after?: string;
    }): Promise<{ data: unknown[]; has_more?: boolean }>;
  };
}

export type StripeWebhookResult = {
  applied: boolean;
  reason:
    | "UNSUPPORTED_EVENT"
    | "INVALID_CATALOG"
    | "INVALID_CHECKOUT"
    | "INVALID_SUBSCRIPTION"
    | "UNKNOWN_CUSTOMER"
    | "CUSTOMER_MISMATCH"
    | "UNCHANGED"
    | "UPDATED";
  status?: "active" | "none";
};

type RecordValue = Record<string, unknown>;

function record(value: unknown): RecordValue | null {
  return value !== null && typeof value === "object"
    ? (value as RecordValue)
    : null;
}

function stringId(value: unknown): string | null {
  if (typeof value === "string" && value.length > 0) return value;
  const object = record(value);
  return typeof object?.id === "string" && object.id.length > 0
    ? object.id
    : null;
}

function metadataUserId(value: unknown): string | null {
  const metadata = record(record(value)?.metadata);
  return typeof metadata?.userId === "string" && metadata.userId.length > 0
    ? metadata.userId
    : null;
}

function productIdFromPrice(value: unknown): string | null {
  return stringId(record(value)?.product);
}

function lineItems(value: unknown): unknown[] {
  const items = record(record(value)?.items);
  return Array.isArray(items?.data) ? items.data : [];
}

function lineItemMatches(
  item: unknown,
  expectedPriceId: string,
  expectedProductId: string,
): boolean {
  const object = record(item);
  const price = record(object?.price);
  return (
    price?.id === expectedPriceId &&
    productIdFromPrice(price) === expectedProductId &&
    object?.quantity === 1
  );
}

function hasSinglePremiumItem(
  value: unknown,
  expectedPriceId: string,
  expectedProductId: string,
): boolean {
  const items = lineItems(value);
  return (
    items.length === 1 &&
    lineItemMatches(items[0], expectedPriceId, expectedProductId)
  );
}

function paidInvoice(value: unknown): boolean {
  const invoice = record(record(value)?.latest_invoice);
  if (!invoice) return false;
  return invoice.status === "paid" || invoice.paid === true;
}

function subscriptionEntitles(
  value: unknown,
  expectedPriceId: string,
  expectedProductId: string,
  livemode: boolean,
): boolean {
  const subscription = record(value);
  if (
    subscription?.livemode !== livemode ||
    !hasSinglePremiumItem(subscription, expectedPriceId, expectedProductId)
  ) {
    return false;
  }
  if (subscription.status === "trialing") return true;
  return subscription.status === "active" && paidInvoice(subscription);
}

function premiumCatalog(
  value: unknown,
  expectedPriceId: string,
): { productId: string; livemode: boolean } | null {
  const price = record(value);
  const product = record(price?.product);
  if (
    price?.id !== expectedPriceId ||
    price.type !== "recurring" ||
    !record(price.recurring) ||
    typeof price.livemode !== "boolean" ||
    typeof product?.id !== "string" ||
    product.id.length === 0 ||
    product.deleted === true
  ) {
    return null;
  }
  return { productId: product.id, livemode: price.livemode };
}

function validateCheckout(
  value: unknown,
  expectedPriceId: string,
  expectedProductId: string,
  livemode: boolean,
): { customerId: string; userId: string } | null {
  const session = record(value);
  const customerId = stringId(session?.customer);
  const subscriptionId = stringId(session?.subscription);
  const metadataId = metadataUserId(session);
  const referenceId =
    typeof session?.client_reference_id === "string"
      ? session.client_reference_id
      : null;
  const items = record(session?.line_items);
  const checkoutItems = Array.isArray(items?.data) ? items.data : [];

  if (
    session?.livemode !== livemode ||
    session?.mode !== "subscription" ||
    session?.status !== "complete" ||
    (session?.payment_status !== "paid" &&
      session?.payment_status !== "no_payment_required") ||
    !customerId ||
    !subscriptionId ||
    !metadataId ||
    referenceId !== metadataId ||
    checkoutItems.length !== 1 ||
    !lineItemMatches(checkoutItems[0], expectedPriceId, expectedProductId)
  ) {
    return null;
  }
  return { customerId, userId: metadataId };
}

function validateSubscriptionEvent(
  value: unknown,
  expectedPriceId: string,
  expectedProductId: string,
  livemode: boolean,
): { customerId: string; userId: string | null } | null {
  const subscription = record(value);
  const customerId = stringId(subscription?.customer);
  if (
    subscription?.livemode !== livemode ||
    !customerId ||
    !hasSinglePremiumItem(subscription, expectedPriceId, expectedProductId)
  ) {
    return null;
  }
  return { customerId, userId: metadataUserId(subscription) };
}

/**
 * Réconcilie un événement signé avec l'état Stripe courant.
 *
 * L'événement sert uniquement de déclencheur et de preuve de rattachement au
 * catalogue Premium. Le droit final est recalculé depuis la liste actuelle des
 * abonnements du client : une livraison répétée ou hors ordre ne réapplique
 * donc jamais aveuglément un ancien état d'abonnement.
 */
export async function reconcileStripeBillingEvent(
  event: Stripe.Event,
  client: StripeBillingClient,
  store: StripeBillingStore,
  expectedPriceId: string,
): Promise<StripeWebhookResult> {
  const supported =
    event.type === "checkout.session.completed" ||
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted";
  if (!supported) {
    return { applied: false, reason: "UNSUPPORTED_EVENT" };
  }

  const catalog = premiumCatalog(
    await client.prices.retrieve(expectedPriceId, {
      expand: ["product"],
    }),
    expectedPriceId,
  );
  if (!catalog || event.livemode !== catalog.livemode) {
    return { applied: false, reason: "INVALID_CATALOG" };
  }

  let identity: { customerId: string; userId: string | null } | null;
  if (event.type === "checkout.session.completed") {
    const eventObject = record(event.data.object);
    const sessionId = stringId(eventObject);
    if (!sessionId) {
      return { applied: false, reason: "INVALID_CHECKOUT" };
    }
    identity = validateCheckout(
      await client.checkout.sessions.retrieve(sessionId, {
        expand: ["line_items.data.price.product", "subscription"],
      }),
      expectedPriceId,
      catalog.productId,
      catalog.livemode,
    );
    if (!identity) {
      return { applied: false, reason: "INVALID_CHECKOUT" };
    }
  } else {
    identity = validateSubscriptionEvent(
      event.data.object,
      expectedPriceId,
      catalog.productId,
      catalog.livemode,
    );
    if (!identity) {
      return { applied: false, reason: "INVALID_SUBSCRIPTION" };
    }
  }

  const user = await store.findByCustomerId(identity.customerId);
  if (!user) return { applied: false, reason: "UNKNOWN_CUSTOMER" };
  if (identity.userId && identity.userId !== user.id) {
    return { applied: false, reason: "CUSTOMER_MISMATCH" };
  }

  const subscriptions: unknown[] = [];
  let startingAfter: string | undefined;
  do {
    const page = await client.subscriptions.list({
      customer: identity.customerId,
      status: "all",
      limit: 100,
      expand: ["data.items.data.price.product", "data.latest_invoice"],
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });
    subscriptions.push(...page.data);
    if (!page.has_more) break;
    const lastId = stringId(page.data.at(-1));
    if (!lastId) {
      throw new Error("STRIPE_SUBSCRIPTION_PAGINATION_INVALID");
    }
    startingAfter = lastId;
  } while (true);

  const status = subscriptions.some((subscription) =>
    subscriptionEntitles(
      subscription,
      expectedPriceId,
      catalog.productId,
      catalog.livemode,
    ),
  )
    ? "active"
    : "none";

  if (user.subscriptionStatus === status) {
    return { applied: false, reason: "UNCHANGED", status };
  }
  const applied = await store.setStatus(user.id, identity.customerId, status);
  return {
    applied,
    reason: applied ? "UPDATED" : "CUSTOMER_MISMATCH",
    status,
  };
}
