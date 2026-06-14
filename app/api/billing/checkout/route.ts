import { NextResponse } from "next/server";
import { jsonError, withErrors } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";
import { rateLimit } from "@/lib/security/rate-limit";
import { env } from "@/lib/env";
import { paymentProvider, stripeEnabled } from "@/lib/payments/provider";

// Ouvre une session de paiement Stripe pour l'abonnement Premium.
// Tant que Stripe n'est pas configuré, renvoie 503 (l'UI masque le bouton).
export const POST = withErrors(async () => {
  const user = await requireUser();
  if (!stripeEnabled) return jsonError(503, "BILLING_DISABLED");
  const rl = await rateLimit(`checkout:${user.id}`, 8, 60 * 60_000);
  if (!rl.allowed) return jsonError(429, "RATE_LIMITED");

  const session = await paymentProvider.createCheckout({
    userId: user.id,
    successUrl: `${env.APP_URL}/settings/premium?status=success`,
    cancelUrl: `${env.APP_URL}/settings/premium?status=cancel`,
  });
  return NextResponse.json({ url: session.url });
});
