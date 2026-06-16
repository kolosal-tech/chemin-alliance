import { NextResponse } from "next/server";
import { jsonError, withErrors } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";
import { rateLimit, LIMITS } from "@/lib/security/rate-limit";
import { env } from "@/lib/env";
import { paymentProvider, stripeEnabled } from "@/lib/payments/provider";

// Ouvre le Stripe Billing Portal (gérer / annuler l'abonnement).
// Nécessite un customer Stripe existant (créé au premier checkout).
export const POST = withErrors(async () => {
  const user = await requireUser();
  if (!stripeEnabled) return jsonError(503, "BILLING_DISABLED");
  const rl = await rateLimit(
    `portal:${user.id}`,
    LIMITS.portal.limit,
    LIMITS.portal.windowMs,
  );
  if (!rl.allowed) return jsonError(429, "RATE_LIMITED");
  if (!user.stripeCustomerId) return jsonError(400, "NO_STRIPE_CUSTOMER");

  try {
    const session = await paymentProvider.createBillingPortalSession(
      user.id,
      `${env.APP_URL}/settings/premium?status=portal_return`,
    );
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[billing/portal]", err);
    return jsonError(502, "BILLING_ERROR");
  }
});
