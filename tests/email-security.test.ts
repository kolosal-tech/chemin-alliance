import { afterEach, describe, expect, it, vi } from "vitest";

async function loadEmail(
  nodeEnv: "development" | "production" | "test",
  resendKey = "",
) {
  vi.stubEnv("NODE_ENV", nodeEnv);
  vi.stubEnv("APP_URL", "https://app.example.test");
  vi.stubEnv("RESEND_API_KEY", resendKey);
  vi.stubEnv("EMAIL_FROM", "Chemin d'Alliance <alliance@example.test>");
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.email-tests.example");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "redis-email-tests-7Kq3pV9m");
  vi.stubEnv("CRON_SECRET", "cron-email-tests-7Kq3pV9mN2xR5tW8cD4h");
  vi.stubEnv(
    "ENCRYPTION_KEY",
    "9f4c2a7e1d8b6035a1e7c9d24b6f8031c5e9a273d4f6180b2c7e5a913d6f804b",
  );
  vi.resetModules();
  return import("@/lib/email");
}

function resendPayload(fetchMock: ReturnType<typeof vi.fn>, index = 0) {
  const init = fetchMock.mock.calls[index]?.[1] as RequestInit;
  return JSON.parse(String(init.body)) as {
    subject: string;
    html: string;
    text: string;
  };
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.resetModules();
});

describe("email - secrets dans les journaux", () => {
  it("ne journalise aucun lien, jeton ou code hors développement", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const email = await loadEmail("test");

    expect(
      await email.sendVerificationEmail("membre@example.test", "VERIFY_SECRET"),
    ).toBe(false);
    await email.sendPasswordResetEmail("membre@example.test", "RESET_SECRET");
    await email.sendCoupleInviteEmail(
      "membre@example.test",
      "Alice",
      "COUPLE_CODE",
    );
    await email.sendBlessingRequestEmail(
      "membre@example.test",
      "Sponsor",
      "Membre",
      "https://app.example.test/fr/parrain/BLESSING_SECRET",
    );

    expect(info).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it("conserve l'aperçu secret uniquement en développement explicite", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const email = await loadEmail("development");

    expect(
      await email.sendVerificationEmail("dev@example.test", "DEV_VERIFY_TOKEN"),
    ).toBe(true);

    expect(info).toHaveBeenCalledOnce();
    expect(String(info.mock.calls[0]?.[0])).toContain("[email:dev]");
    expect(String(info.mock.calls[0]?.[0])).toContain("DEV_VERIFY_TOKEN");
  });

  it("ne journalise jamais le corps fournisseur qui peut refléter un jeton", async () => {
    const token = "PROVIDER_ECHO_SECRET";
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(`invalid body containing ${token}`, {
        status: 400,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const email = await loadEmail("production", "resend-test-key");

    expect(
      await email.sendVerificationEmail("private@example.test", token),
    ).toBe(false);

    const logs = JSON.stringify(error.mock.calls);
    expect(logs).toContain("400");
    expect(logs).not.toContain(token);
    expect(logs).not.toContain("private@example.test");
    expect(logs).not.toContain("invalid body");
  });
});

describe("email - encodage des données dynamiques", () => {
  it("échappe nom et code d'invitation dans le HTML et normalise le sujet", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const email = await loadEmail("production", "resend-test-key");

    await email.sendCoupleInviteEmail(
      "invitee@example.test",
      'Alice</h1><img src=x onerror="attack">\r\nBcc: victim@example.test',
      "<script>CODE</script>",
    );

    const payload = resendPayload(fetchMock);
    expect(payload.html).not.toContain("<img");
    expect(payload.html).not.toContain("<script>");
    expect(payload.html).toContain("&lt;img");
    expect(payload.html).toContain("&lt;script&gt;CODE&lt;/script&gt;");
    expect(payload.subject).not.toMatch(/[\r\n]/);
  });

  it("neutralise les liens hors origine et échappe les noms de bénédiction", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const email = await loadEmail("production", "resend-test-key");

    await email.sendBlessingRequestEmail(
      "sponsor@example.test",
      "<b>Sponsor</b>",
      "<img src=x>",
      "javascript:alert(1)",
    );

    const payload = resendPayload(fetchMock);
    expect(payload.html).not.toContain("<b>Sponsor</b>");
    expect(payload.html).not.toContain("<img");
    expect(payload.html).not.toContain("javascript:");
    expect(payload.html).toContain('href="https://app.example.test"');
  });
});
