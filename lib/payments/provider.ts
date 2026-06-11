/**
 * Abstraction paiement — STUB v1.
 * Brancher Stripe plus tard : implémenter StripePaymentProvider
 * (checkout.sessions.create, webhooks constructEvent) sans toucher aux appelants.
 */
export type CheckoutRequest = {
  userId: string;
  product: "DECOUVERTE_PLUS" | "DISCERNEMENT" | "PACK_ALLIANCE" | "COACH_SESSION";
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
}

/** Implémentation factice : simule un checkout immédiat. */
export class FakePaymentProvider implements PaymentProvider {
  async createCheckout(req: CheckoutRequest): Promise<CheckoutSession> {
    return {
      id: `fake_${req.product}_${req.userId}`,
      url: req.successUrl,
      status: "complete",
    };
  }
  async getSubscriptionStatus(): Promise<"none" | "active"> {
    return "none";
  }
}

export const paymentProvider: PaymentProvider = new FakePaymentProvider();
