import { describe, expect, it } from "vitest";
import {
  requireStripeRedirectUrl,
  safeStripeRedirectUrl,
} from "@/lib/payments/redirect";

describe("redirections Stripe", () => {
  it("n'autorise que la surface HTTPS attendue", () => {
    expect(
      safeStripeRedirectUrl(
        "https://checkout.stripe.com/c/pay/cs_test",
        "checkout",
      ),
    ).toBe("https://checkout.stripe.com/c/pay/cs_test");
    expect(
      safeStripeRedirectUrl(
        "https://billing.stripe.com/p/session/test",
        "portal",
      ),
    ).toBe("https://billing.stripe.com/p/session/test");

    expect(
      safeStripeRedirectUrl("https://billing.stripe.com/p/test", "checkout"),
    ).toBeNull();
    expect(
      safeStripeRedirectUrl("https://checkout.stripe.com/test", "portal"),
    ).toBeNull();
  });

  it.each([
    "javascript:alert(1)",
    "data:text/html,phishing",
    "/relative",
    "http://checkout.stripe.com/insecure",
    "https://checkout.stripe.com.evil.example/phishing",
    "https://evil.example/?next=https://checkout.stripe.com",
    "https://user:password@checkout.stripe.com/session",
  ])("refuse %s", (url) => {
    expect(safeStripeRedirectUrl(url, "checkout")).toBeNull();
  });

  it("échoue fermé côté serveur", () => {
    expect(() =>
      requireStripeRedirectUrl("https://evil.example", "portal"),
    ).toThrow("STRIPE_PORTAL_URL_INVALID");
  });
});
