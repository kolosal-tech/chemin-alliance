import { afterEach, describe, expect, it, vi } from "vitest";
import { generateCode, hashCode } from "@/lib/sms";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.resetModules();
});

describe("sms - code de vérification", () => {
  it("generateCode renvoie 6 chiffres", () => {
    for (let i = 0; i < 50; i++) {
      expect(generateCode()).toMatch(/^\d{6}$/);
    }
  });

  it("hashCode est déterministe et ne renvoie pas le code en clair", () => {
    const h1 = hashCode("123456");
    const h2 = hashCode("123456");
    expect(h1).toBe(h2);
    expect(h1).not.toContain("123456");
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
  });

  it("hashCode diffère selon le code", () => {
    expect(hashCode("000000")).not.toBe(hashCode("000001"));
  });

  it("ne journalise pas le numéro ou le message libre renvoyé par Twilio", async () => {
    vi.stubEnv("TWILIO_ACCOUNT_SID", "AC_secure_test");
    vi.stubEnv("TWILIO_AUTH_TOKEN", "twilio-secure-token");
    vi.stubEnv("TWILIO_VERIFY_SERVICE_SID", "VA_secure_test");
    vi.resetModules();

    const phone = "+22670000000";
    const providerMessage = `Invalid destination ${phone}`;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ code: 60200, message: providerMessage }),
          {
            status: 400,
            headers: { "content-type": "application/json" },
          },
        ),
      ),
    );
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const configuredSms = await import("@/lib/sms");

    expect(await configuredSms.startVerification(phone)).toBe(false);
    const logs = JSON.stringify(error.mock.calls);
    expect(logs).toContain("60200");
    expect(logs).toContain("400");
    expect(logs).not.toContain(phone);
    expect(logs).not.toContain(providerMessage);
  });
});
