import Stripe from "stripe";
import { prisma } from "@/lib/db";

/**
 * Abstraction paiement. Branche Stripe (abonnement Premium) si STRIPE_SECRET_KEY
 * + STRIPE_PRICE_PREMIUM sont configurés ; sinon FakePaymentProvider (aucun
 * paiement, tout le monde "none"). L'état d'abonnement est lu en base
 * (User.subscriptionStatus), mis à jour par le webhook Stripe.
 *
 * RAPPEL doctrine : sécurité/dignité (blocage, signalement, suppression, filtres
 * de base) ne se monétisent JAMAIS — voir lib/payments/entitlements.
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

/** Implémentation Stripe — abonnement Premium mensuel. */
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
    let customerId = user?.stripeCustomerId ?? undefined;
    if (!customerId) {
      const customer = await this.stripe.customers.create({
        email: user?.email,
        metadata: { userId: req.userId },
      });
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
    });
    return {
      id: session.id,
      url: session.url ?? req.successUrl,
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
    return { url: session.url };
  }
}

const secret = process.env.STRIPE_SECRET_KEY;
const pricePremium = process.env.STRIPE_PRICE_PREMIUM;

export const stripeEnabled = Boolean(secret && pricePremium);

export const paymentProvider: PaymentProvider =
  secret && pricePremium
    ? new StripePaymentProvider(secret, pricePremium)
    : new FakePaymentProvider();
