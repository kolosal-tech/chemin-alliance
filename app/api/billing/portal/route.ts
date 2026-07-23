import { NextResponse } from "next/server";
import {
  jsonError,
  readOptionalJsonLimited,
  withErrors,
} from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";
import { rateLimit, LIMITS } from "@/lib/security/rate-limit";
import { env } from "@/lib/env";
import { paymentProvider, stripeEnabled } from "@/lib/payments/provider";
import { routing } from "@/i18n/routing";
import { safeErrorDetails } from "@/lib/security/safe-error";

// Ouvre le Stripe Billing Portal (gérer / annuler l'abonnement).
// Nécessite un customer Stripe existant (créé au premier checkout).
export const POST = withErrors(async (req: Request) => {
  const user = await requireUser();
  if (!stripeEnabled) return jsonError(503, "BILLING_DISABLED");
  const rl = await rateLimit(
    `portal:${user.id}`,
    LIMITS.portal.limit,
    LIMITS.portal.windowMs,
  );
  if (!rl.allowed) return jsonError(429, "RATE_LIMITED");
  if (!user.stripeCustomerId) return jsonError(400, "NO_STRIPE_CUSTOMER");

  const body = (await readOptionalJsonLimited(req)) as {
    locale?: string;
  } | null;
  const requested = body?.locale ?? "";
  const locale = (routing.locales as readonly string[]).includes(requested)
    ? requested
    : routing.defaultLocale;

  try {
    const session = await paymentProvider.createBillingPortalSession(
      user.id,
      `${env.APP_URL}/${locale}/settings/premium?status=portal_return`,
    );
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[billing/portal]", safeErrorDetails(err));
    return jsonError(502, "BILLING_ERROR");
  }
});
