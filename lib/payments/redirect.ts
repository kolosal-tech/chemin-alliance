export type StripeRedirectSurface = "checkout" | "portal";

const PRODUCTION_HOSTS: Record<StripeRedirectSurface, string> = {
  checkout: "checkout.stripe.com",
  portal: "billing.stripe.com",
};

/**
 * Réduit toute redirection paiement à la surface Stripe attendue.
 * Une URL relative, un autre domaine ou un schéma actif (`javascript:`,
 * `data:`...) est refusé même si la réponse API a été altérée.
 */
export function safeStripeRedirectUrl(
  value: unknown,
  surface: StripeRedirectSurface,
): string | null {
  if (typeof value !== "string") return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;

  const productionHost = PRODUCTION_HOSTS[surface];
  const testHost =
    surface === "checkout" ? "checkout.stripe.test" : "billing.stripe.test";
  const allowed =
    url.hostname === productionHost ||
    (process.env.NODE_ENV === "test" && url.hostname === testHost);
  if (!allowed || url.username || url.password) return null;

  return url.toString();
}

export function requireStripeRedirectUrl(
  value: unknown,
  surface: StripeRedirectSurface,
): string {
  const url = safeStripeRedirectUrl(value, surface);
  if (!url) {
    throw new Error(`STRIPE_${surface.toUpperCase()}_URL_INVALID`);
  }
  return url;
}
