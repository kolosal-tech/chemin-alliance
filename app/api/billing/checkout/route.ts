import { NextResponse } from "next/server";
import {
  jsonError,
  readOptionalJsonLimited,
  withErrors,
} from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";
import { rateLimit } from "@/lib/security/rate-limit";
import { env } from "@/lib/env";
import {
  paymentProvider,
  stripeCheckoutEnabled,
} from "@/lib/payments/provider";
import { routing } from "@/i18n/routing";

// Ouvre une session de paiement Stripe pour l'abonnement Premium.
// Tant que Stripe n'est pas configuré, renvoie 503 (l'UI masque le bouton).
export const POST = withErrors(async (req: Request) => {
  const user = await requireUser();
  if (!user.isVerified) return jsonError(403, "EMAIL_NOT_VERIFIED");
  if (!stripeCheckoutEnabled) return jsonError(503, "BILLING_DISABLED");
  const rl = await rateLimit(`checkout:${user.id}`, 8, 60 * 60_000);
  if (!rl.allowed) return jsonError(429, "RATE_LIMITED");

  // Locale transmise par le client → on garde l'utilisateur dans sa langue au
  // retour de Stripe (sinon next-intl ajoute une redirection /<locale>/).
  const body = (await readOptionalJsonLimited(req)) as {
    locale?: string;
  } | null;
  const requested = body?.locale ?? "";
  const locale = (routing.locales as readonly string[]).includes(requested)
    ? requested
    : routing.defaultLocale;
  const returnBase = `${env.APP_URL}/${locale}/settings/premium`;

  const session = await paymentProvider.createCheckout({
    userId: user.id,
    successUrl: `${returnBase}?status=success`,
    cancelUrl: `${returnBase}?status=cancel`,
  });
  return NextResponse.json({ url: session.url });
});
