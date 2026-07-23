import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createMomoCheckout,
  flutterwaveEnabled,
  verifyFlutterwaveSignature,
  buildMomoPaymentPayload,
} from "@/lib/payments/flutterwave";

describe("flutterwave - Mobile Money XOF (dormant + webhook)", () => {
  let savedSecret: string | undefined;
  let savedHash: string | undefined;
  beforeEach(() => {
    savedSecret = process.env.FLUTTERWAVE_SECRET_KEY;
    savedHash = process.env.FLUTTERWAVE_WEBHOOK_HASH;
  });
  afterEach(() => {
    if (savedSecret === undefined) delete process.env.FLUTTERWAVE_SECRET_KEY;
    else process.env.FLUTTERWAVE_SECRET_KEY = savedSecret;
    if (savedHash === undefined) delete process.env.FLUTTERWAVE_WEBHOOK_HASH;
    else process.env.FLUTTERWAVE_WEBHOOK_HASH = savedHash;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("dormant sans clé secrète, actif avec", () => {
    delete process.env.FLUTTERWAVE_SECRET_KEY;
    expect(flutterwaveEnabled()).toBe(false);
    process.env.FLUTTERWAVE_SECRET_KEY = "FLWSECK_TEST-x";
    expect(flutterwaveEnabled()).toBe(true);
  });

  it("vérif webhook : faux sans secret ou sans en-tête", () => {
    delete process.env.FLUTTERWAVE_WEBHOOK_HASH;
    expect(verifyFlutterwaveSignature("abc")).toBe(false);
    process.env.FLUTTERWAVE_WEBHOOK_HASH = "secret-hash";
    expect(verifyFlutterwaveSignature(null)).toBe(false);
    expect(verifyFlutterwaveSignature(undefined)).toBe(false);
  });

  it("vérif webhook : vrai seulement si l'en-tête == secret (temps constant)", () => {
    process.env.FLUTTERWAVE_WEBHOOK_HASH = "secret-hash"; // 11 caractères
    expect(verifyFlutterwaveSignature("secret-hash")).toBe(true);
    expect(verifyFlutterwaveSignature("secret-hashX")).toBe(false); // longueur ≠
    expect(verifyFlutterwaveSignature("secret-hasX")).toBe(false); // même longueur, ≠
  });

  it("payload MoMo : XOF, mobilemoneyfranco, meta.userId, tx_ref fourni", () => {
    const p = buildMomoPaymentPayload({
      userId: "u1",
      email: "a@b.co",
      amountXof: 2000,
      redirectUrl: "https://x/redirect",
      txRef: "fixed-ref",
    });
    expect(p.currency).toBe("XOF");
    expect(p.amount).toBe(2000);
    expect(p.payment_options).toBe("mobilemoneyfranco");
    expect(p.meta.userId).toBe("u1");
    expect(p.customer.email).toBe("a@b.co");
    expect(p.tx_ref).toBe("fixed-ref");
  });

  it("tx_ref auto-généré et préfixé si absent", () => {
    const p = buildMomoPaymentPayload({
      userId: "u1",
      email: "a@b.co",
      amountXof: 2000,
      redirectUrl: "x",
    });
    expect(p.tx_ref).toMatch(/^ca-momo-u1-/);
  });

  it("ne journalise jamais le corps fournisseur contenant des données client", async () => {
    process.env.FLUTTERWAVE_SECRET_KEY = "FLWSECK_secure";
    const reflected = "a@b.co user-1 provider-private-detail";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(reflected, { status: 400 })),
    );
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      createMomoCheckout({
        userId: "user-1",
        email: "a@b.co",
        amountXof: 2000,
        redirectUrl: "https://app.example/return",
        txRef: "fixed-ref",
      }),
    ).rejects.toMatchObject({ message: "FLUTTERWAVE_ERROR", status: 502 });

    const logs = JSON.stringify(error.mock.calls);
    expect(logs).toContain("400");
    expect(logs).not.toContain(reflected);
    expect(logs).not.toContain("a@b.co");
    expect(logs).not.toContain("user-1");
  });
});
