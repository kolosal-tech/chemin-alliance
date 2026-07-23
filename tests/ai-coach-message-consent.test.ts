import { beforeEach, describe, expect, it, vi } from "vitest";

const errors = vi.hoisted(() => ({
  ConsentRequired: class ConsentRequired extends Error {},
  QuotaExceeded: class QuotaExceeded extends Error {},
  Deadline: class Deadline extends Error {},
}));

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  getActiveConsent: vi.fn(),
  withAdmittedTransfer: vi.fn(),
  rateLimit: vi.fn(),
  matchFindFirst: vi.fn(),
  coachMessageFindMany: vi.fn(),
  coachMessageCreateMany: vi.fn(),
  askCoach: vi.fn(),
  withDeadline: vi.fn(),
}));

vi.mock("@/lib/security/session", () => ({
  requireUser: mocks.requireUser,
}));

vi.mock("@/lib/ai-coach/consent", () => ({
  AiCoachConsentRequiredError: errors.ConsentRequired,
  AiCoachQuotaExceededError: errors.QuotaExceeded,
  getActiveAiCoachConsent: mocks.getActiveConsent,
  withAdmittedAiCoachTransfer: mocks.withAdmittedTransfer,
}));

vi.mock("@/lib/llm/deadline", () => ({
  assertLlmDeadlineActive: vi.fn(),
  LlmDeadlineExceededError: errors.Deadline,
  withLlmDeadline: mocks.withDeadline,
}));

vi.mock("@/lib/security/rate-limit", () => ({
  LIMITS: {
    aiCoach: { limit: 10, windowMs: 60_000 },
    aiCoachIp: { limit: 30, windowMs: 60_000 },
  },
  rateLimit: mocks.rateLimit,
}));

vi.mock("@/lib/ai-coach", () => ({
  DAILY_FREE_LIMIT: 5,
  askCoach: mocks.askCoach,
}));

vi.mock("@/lib/security/crypto", () => ({
  encryptField: (value: string) => `encrypted:${value}`,
  decryptOptional: (value: string | null) => value,
}));

vi.mock("@/lib/llm/matrix", () => ({
  tierForSubscription: () => "premium",
}));

vi.mock("@/lib/alliance", () => ({
  activeMatchMemberWhere: (matchId: string, userId: string) => ({
    id: matchId,
    userId,
  }),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    match: { findFirst: mocks.matchFindFirst },
    coachMessage: {
      findMany: mocks.coachMessageFindMany,
      createMany: mocks.coachMessageCreateMany,
    },
  },
}));

import { POST } from "@/app/api/ai-coach/message/route";

function request() {
  return new Request("https://alliance.example/api/ai-coach/message", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      question: "Comment mieux écouter ?",
      mode: "individual",
    }),
  });
}

describe("POST /api/ai-coach/message - consentement linéarisable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({
      id: "user-1",
      isVerified: true,
      subscriptionStatus: "active",
      locale: "fr",
      rulesetId: "christian_evangelical_default",
      country: "FR",
    });
    mocks.getActiveConsent.mockResolvedValue({
      id: "consent-current",
      grantedAt: new Date(),
    });
    mocks.withAdmittedTransfer.mockImplementation(
      async (
        _userId: string,
        _isPremium: boolean,
        callback: (admission: {
          leaseId: string;
          remaining: number | null;
        }) => Promise<unknown>,
      ) => callback({ leaseId: "lease-1", remaining: null }),
    );
    mocks.withDeadline.mockImplementation(
      async (_timeoutMs: number, callback: () => Promise<unknown>) =>
        callback(),
    );
    mocks.rateLimit.mockResolvedValue({ allowed: true });
    mocks.coachMessageFindMany.mockResolvedValue([]);
    mocks.coachMessageCreateMany.mockResolvedValue({ count: 2 });
    mocks.askCoach.mockResolvedValue({
      text: "Commence par reformuler calmement.",
      guardrail: false,
      provider: "openai",
    });
  });

  it("échoue fermé avant quota, historique, persistance ou fournisseur", async () => {
    mocks.getActiveConsent.mockResolvedValue(null);

    const response = await POST(request());

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: "AI_COACH_CONSENT_REQUIRED",
    });
    expect(mocks.rateLimit).not.toHaveBeenCalled();
    expect(mocks.withAdmittedTransfer).not.toHaveBeenCalled();
    expect(mocks.coachMessageFindMany).not.toHaveBeenCalled();
    expect(mocks.coachMessageCreateMany).not.toHaveBeenCalled();
    expect(mocks.askCoach).not.toHaveBeenCalled();
  });

  it("n'atteint le fournisseur qu'après l'admission courte et hors transaction", async () => {
    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(mocks.getActiveConsent).toHaveBeenCalledWith("user-1");
    expect(mocks.withAdmittedTransfer).toHaveBeenCalledWith(
      "user-1",
      true,
      expect.any(Function),
    );
    expect(mocks.withDeadline).toHaveBeenCalledWith(
      15_000,
      expect.any(Function),
    );
    expect(mocks.askCoach).toHaveBeenCalledOnce();
    expect(mocks.coachMessageCreateMany).toHaveBeenCalledOnce();
  });

  it("revalide sous verrou et bloque une révocation concurrente", async () => {
    mocks.withAdmittedTransfer.mockRejectedValue(new errors.ConsentRequired());

    const response = await POST(request());

    expect(response.status).toBe(403);
    expect(mocks.rateLimit).toHaveBeenCalledTimes(2);
    expect(mocks.askCoach).not.toHaveBeenCalled();
    expect(mocks.coachMessageCreateMany).not.toHaveBeenCalled();
  });

  it("arrête la requête sur l'échéance fournisseur explicite", async () => {
    mocks.withDeadline.mockRejectedValue(new errors.Deadline());

    const response = await POST(request());

    expect(response.status).toBe(504);
    await expect(response.json()).resolves.toMatchObject({
      error: "AI_COACH_PROVIDER_TIMEOUT",
    });
    expect(mocks.coachMessageCreateMany).not.toHaveBeenCalled();
  });

  it("refuse avant fournisseur quand la réservation atomique du quota échoue", async () => {
    mocks.requireUser.mockResolvedValue({
      id: "user-1",
      isVerified: true,
      subscriptionStatus: null,
      locale: "fr",
      rulesetId: "christian_evangelical_default",
      country: "FR",
    });
    mocks.withAdmittedTransfer.mockRejectedValue(new errors.QuotaExceeded());

    const response = await POST(request());

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toEqual({
      quotaExceeded: true,
      limit: 5,
    });
    expect(mocks.askCoach).not.toHaveBeenCalled();
    expect(mocks.coachMessageCreateMany).not.toHaveBeenCalled();
    expect(mocks.withAdmittedTransfer).toHaveBeenCalledWith(
      "user-1",
      false,
      expect.any(Function),
    );
  });

  it("applique des buckets distincts à l'utilisateur et à l'IP", async () => {
    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(mocks.rateLimit).toHaveBeenNthCalledWith(
      1,
      "ai:user:user-1",
      10,
      60_000,
    );
    expect(mocks.rateLimit).toHaveBeenNthCalledWith(
      2,
      expect.stringMatching(/^ai:ip:/),
      30,
      60_000,
    );
  });
});
