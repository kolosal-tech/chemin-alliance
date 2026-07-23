import Stripe from "stripe";
import { prisma } from "@/lib/db";
import { requireStripeRedirectUrl } from "@/lib/payments/redirect";

/**
 * Abstraction paiement. Branche Stripe (abonnement Premium) si STRIPE_SECRET_KEY
 * + STRIPE_PRICE_PREMIUM sont configurés ; sinon FakePaymentProvider (aucun
 * paiement, tout le monde "none"). L'état d'abonnement est lu en base
 * (User.subscriptionStatus), mis à jour par le webhook Stripe.
 *
 * RAPPEL doctrine : sécurité/dignité (blocage, signalement, suppression, filtres
 * de base) ne se monétisent JAMAIS - voir lib/payments/entitlements.
 */
export type CheckoutRequest = {
  userId: string;
  successUrl: string;
  cancelUrl: string;
};

export type CheckoutSession = {
  id: string;
  url: string;
  status: "open" | "complete";
};

export interface PaymentProvider {
  createCheckout(req: CheckoutRequest): Promise<CheckoutSession>;
  getSubscriptionStatus(userId: string): Promise<"none" | "active">;
  createBillingPortalSession(
    userId: string,
    returnUrl: string,
  ): Promise<{ url: string }>;
}

/** Implémentation factice : aucun paiement, aucun abonnement actif. */
export class FakePaymentProvider implements PaymentProvider {
  async createCheckout(req: CheckoutRequest): Promise<CheckoutSession> {
    return {
      id: `fake_${req.userId}`,
      url: req.successUrl,
      status: "complete",
    };
  }
  async getSubscriptionStatus(): Promise<"none" | "active"> {
    return "none";
  }
  async createBillingPortalSession(
    _userId: string,
    returnUrl: string,
  ): Promise<{ url: string }> {
    return { url: returnUrl };
  }
}

/** Implémentation Stripe - abonnement Premium mensuel. */
export class StripePaymentProvider implements PaymentProvider {
  private stripe: Stripe;
  private price: string;
  constructor(secretKey: string, price: string) {
    this.stripe = new Stripe(secretKey);
    this.price = price;
  }

  async createCheckout(req: CheckoutRequest): Promise<CheckoutSession> {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { stripeCustomerId: true, email: true },
    });
    if (!user) {
      throw Object.assign(new Error("USER_NOT_FOUND"), { status: 404 });
    }
    let customerId = user?.stripeCustomerId ?? undefined;
    if (!customerId) {
      const customer = await this.stripe.customers.create(
        {
          email: user.email,
          metadata: { userId: req.userId },
        },
        {
          // Stabilise les nouvelles tentatives/concurrences de création client.
          idempotencyKey: `chemin-alliance:customer:${req.userId}`,
        },
      );
      customerId = customer.id;
      await prisma.user.update({
        where: { id: req.userId },
        data: { stripeCustomerId: customerId },
      });
    }
    const session = await this.stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: this.price, quantity: 1 }],
      success_url: req.successUrl,
      cancel_url: req.cancelUrl,
      client_reference_id: req.userId,
      metadata: { userId: req.userId },
      subscription_data: { metadata: { userId: req.userId } },
    });
    if (!session.url) {
      throw new Error("STRIPE_CHECKOUT_URL_MISSING");
    }
    return {
      id: session.id,
      url: requireStripeRedirectUrl(session.url, "checkout"),
      status: "open",
    };
  }

  /** Lu en base (mis à jour par le webhook), pas d'appel Stripe à chaque vérif. */
  async getSubscriptionStatus(userId: string): Promise<"none" | "active"> {
    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionStatus: true },
    });
    return u?.subscriptionStatus === "active" ? "active" : "none";
  }

  async createBillingPortalSession(
    userId: string,
    returnUrl: string,
  ): Promise<{ url: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    });
    if (!user?.stripeCustomerId) {
      throw Object.assign(new Error("NO_STRIPE_CUSTOMER"), { status: 400 });
    }
    const session = await this.stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: returnUrl,
    });
    return { url: requireStripeRedirectUrl(session.url, "portal") };
  }
}

const secret = process.env.STRIPE_SECRET_KEY;
const pricePremium = process.env.STRIPE_PRICE_PREMIUM;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

/** Stripe est disponible pour le portail dès que l'API et le prix existent. */
export const stripeEnabled = Boolean(secret && pricePremium);
/**
 * Un nouveau paiement est refusé si son webhook ne pourrait pas établir le
 * droit Premium. Le portail reste disponible pour permettre les annulations.
 */
export const stripeCheckoutEnabled = Boolean(
  secret && pricePremium && webhookSecret,
);

export const paymentProvider: PaymentProvider =
  secret && pricePremium
    ? new StripePaymentProvider(secret, pricePremium)
    : new FakePaymentProvider();
