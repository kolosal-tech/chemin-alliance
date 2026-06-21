import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/db";

// Webhook Stripe — met à jour User.subscriptionStatus. Signature vérifiée
// (STRIPE_WEBHOOK_SECRET). Corps BRUT requis -> req.text(), pas de parsing.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const secret = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const stripe = secret ? new Stripe(secret) : null;

async function setStatusByCustomer(customerId: string, status: string) {
  await prisma.user.updateMany({
    where: { stripeCustomerId: customerId },
    data: { subscriptionStatus: status },
  });
}

export async function POST(req: Request) {
  if (!stripe || !webhookSecret) {
    console.error(
      "[webhooks/stripe] événement reçu mais billing non configuré — STRIPE_SECRET_KEY ou STRIPE_WEBHOOK_SECRET manquant en prod",
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
      "[webhooks/stripe] signature invalide — STRIPE_WEBHOOK_SECRET ne correspond pas au secret de l'endpoint (ou mauvais mode test/live)",
      err,
    );
    return NextResponse.json({ error: "BAD_SIGNATURE" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object as Stripe.Checkout.Session;
      const userId = s.metadata?.userId ?? s.client_reference_id ?? null;
      const customerId =
        typeof s.customer === "string" ? s.customer : (s.customer?.id ?? null);
      if (userId) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            subscriptionStatus: "active",
            ...(customerId ? { stripeCustomerId: customerId } : {}),
          },
        });
      } else if (customerId) {
        await setStatusByCustomer(customerId, "active");
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId =
        typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      const active = sub.status === "active" || sub.status === "trialing";
      await setStatusByCustomer(customerId, active ? "active" : "none");
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId =
        typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      await setStatusByCustomer(customerId, "none");
      break;
    }
  }
  return NextResponse.json({ received: true });
}
