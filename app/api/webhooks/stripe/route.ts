import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/db";
import {
  reconcileStripeBillingEvent,
  type StripeBillingStore,
} from "@/lib/payments/stripe-webhook";
import { safeErrorDetails } from "@/lib/security/safe-error";

// Webhook Stripe - met à jour User.subscriptionStatus. Signature vérifiée
// (STRIPE_WEBHOOK_SECRET). Corps BRUT requis -> req.text(), pas de parsing.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const secret = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const premiumPrice = process.env.STRIPE_PRICE_PREMIUM;
const stripe = secret ? new Stripe(secret) : null;

const billingStore: StripeBillingStore = {
  async findByCustomerId(customerId) {
    return prisma.user.findUnique({
      where: { stripeCustomerId: customerId },
      select: { id: true, subscriptionStatus: true },
    });
  },
  async setStatus(userId, customerId, status) {
    const result = await prisma.user.updateMany({
      where: { id: userId, stripeCustomerId: customerId },
      data: { subscriptionStatus: status },
    });
    return result.count === 1;
  },
};

export async function POST(req: Request) {
  if (!stripe || !webhookSecret || !premiumPrice) {
    console.error(
      "[webhooks/stripe] événement reçu mais billing non configuré",
    );
    return NextResponse.json({ error: "BILLING_DISABLED" }, { status: 503 });
  }
  const sig = req.headers.get("stripe-signature");
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig ?? "", webhookSecret);
  } catch (err) {
    console.error(
      "[webhooks/stripe] signature invalide - STRIPE_WEBHOOK_SECRET ne correspond pas au secret de l'endpoint (ou mauvais mode test/live)",
      safeErrorDetails(err),
    );
    return NextResponse.json({ error: "BAD_SIGNATURE" }, { status: 400 });
  }

  try {
    const result = await reconcileStripeBillingEvent(
      event,
      stripe,
      billingStore,
      premiumPrice,
    );
    return NextResponse.json({ received: true, ...result });
  } catch (err) {
    // Une erreur Stripe/DB est transitoire : 500 force Stripe à relivrer
    // l'événement. Aucun détail interne n'est exposé au client.
    console.error(
      "[webhooks/stripe] réconciliation impossible",
      safeErrorDetails(err),
    );
    return NextResponse.json(
      { error: "WEBHOOK_PROCESSING_FAILED" },
      { status: 500 },
    );
  }
}
