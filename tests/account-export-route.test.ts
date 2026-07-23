import { beforeEach, describe, expect, it, vi } from "vitest";
import { EXPORT_QUERY_TAKE } from "@/lib/account-export";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  rateLimit: vi.fn(),
  consentFindMany: vi.fn(),
  matchFindMany: vi.fn(),
  messageFindMany: vi.fn(),
  allianceAnswerFindMany: vi.fn(),
  coachMessageFindMany: vi.fn(),
  agentInsightFindMany: vi.fn(),
  coupleSpaceFindFirst: vi.fn(),
  coupleMessageFindMany: vi.fn(),
  gameRoundFindMany: vi.fn(),
  sponsorFindUnique: vi.fn(),
  blockFindMany: vi.fn(),
  blockCount: vi.fn(),
  passFindMany: vi.fn(),
  passCount: vi.fn(),
  bookingFindMany: vi.fn(),
  reportFindMany: vi.fn(),
  aiCoachUsageFindMany: vi.fn(),
  phoneVerificationFindMany: vi.fn(),
  pushSubscriptionCount: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/security/session", () => ({
  requireAuthenticatedUser: mocks.requireUser,
}));

vi.mock("@/lib/security/rate-limit", () => ({
  LIMITS: { export: { limit: 3, windowMs: 3_600_000 } },
  rateLimit: mocks.rateLimit,
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    $transaction: mocks.transaction,
    consent: { findMany: mocks.consentFindMany },
    match: { findMany: mocks.matchFindMany },
    message: { findMany: mocks.messageFindMany },
    allianceAnswer: { findMany: mocks.allianceAnswerFindMany },
    coachMessage: { findMany: mocks.coachMessageFindMany },
    agentInsight: { findMany: mocks.agentInsightFindMany },
    coupleSpace: { findFirst: mocks.coupleSpaceFindFirst },
    coupleMessage: { findMany: mocks.coupleMessageFindMany },
    gameRound: { findMany: mocks.gameRoundFindMany },
    sponsor: { findUnique: mocks.sponsorFindUnique },
    block: { findMany: mocks.blockFindMany, count: mocks.blockCount },
    pass: { findMany: mocks.passFindMany, count: mocks.passCount },
    booking: { findMany: mocks.bookingFindMany },
    report: { findMany: mocks.reportFindMany },
    aiCoachUsage: { findMany: mocks.aiCoachUsageFindMany },
    phoneVerification: { findMany: mocks.phoneVerificationFindMany },
    pushSubscription: { count: mocks.pushSubscriptionCount },
  },
}));

import { GET } from "@/app/api/me/export/route";

const NOW = new Date("2026-07-23T12:00:00.000Z");

describe("GET /api/me/export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({
      id: "me",
      email: "me@example.test",
      passwordHash: "must-never-be-exported",
      emailVerifyToken: "must-never-be-exported",
      passwordResetToken: "must-never-be-exported",
      sessionVersion: 9,
      displayName: "Membre",
      age: 34,
      gender: "F",
      role: "USER",
      kind: "HUMAN",
      locale: "fr",
      rulesetId: "rules",
      season: "JOURNEY",
      isVerified: true,
      photoUrl: null,
      photoBlurredByDefault: true,
      photoBlurhash: null,
      cityApprox: null,
      country: "France",
      phone: null,
      phoneVerified: false,
      stripeCustomerId: null,
      subscriptionStatus: null,
      lastDevotionDate: null,
      currentStreak: 0,
      longestStreak: 0,
      onboardingDoneAt: null,
      deletedAt: null,
      createdAt: NOW,
      updatedAt: NOW,
      faithProfile: null,
      relationshipProfile: null,
      privacySettings: null,
    });
    mocks.rateLimit.mockResolvedValue({ allowed: true });
    for (const mock of [
      mocks.consentFindMany,
      mocks.matchFindMany,
      mocks.messageFindMany,
      mocks.allianceAnswerFindMany,
      mocks.coachMessageFindMany,
      mocks.agentInsightFindMany,
      mocks.coupleMessageFindMany,
      mocks.gameRoundFindMany,
      mocks.blockFindMany,
      mocks.passFindMany,
      mocks.bookingFindMany,
      mocks.reportFindMany,
      mocks.aiCoachUsageFindMany,
      mocks.phoneVerificationFindMany,
    ]) {
      mock.mockResolvedValue([]);
    }
    mocks.coupleSpaceFindFirst.mockResolvedValue(null);
    mocks.sponsorFindUnique.mockResolvedValue(null);
    mocks.blockCount.mockResolvedValue(0);
    mocks.passCount.mockResolvedValue(0);
    mocks.pushSubscriptionCount.mockResolvedValue(0);
    mocks.transaction.mockImplementation(
      async (operations: Array<Promise<unknown>>) => Promise.all(operations),
    );
  });

  it("borne les requêtes, exclut les messages bloqués reçus et désactive le cache", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe(
      "private, no-store, max-age=0",
    );
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");

    expect(mocks.messageFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [{ senderId: "me" }, { moderationStatus: { not: "BLOCKED" } }],
        }),
        take: EXPORT_QUERY_TAKE,
      }),
    );
    expect(mocks.gameRoundFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: EXPORT_QUERY_TAKE }),
    );
    expect(mocks.consentFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          type: true,
          version: true,
          purpose: true,
          recipient: true,
          grantedAt: true,
          revokedAt: true,
        }),
      }),
    );
    expect(mocks.transaction).toHaveBeenCalledWith(expect.any(Array), {
      isolationLevel: "RepeatableRead",
    });
    expect(
      JSON.stringify(mocks.sponsorFindUnique.mock.calls[0][0].select),
    ).not.toContain("token");
    expect(
      JSON.stringify(mocks.coupleSpaceFindFirst.mock.calls[0][0].select),
    ).not.toContain("inviteCode");
    expect(
      JSON.stringify(mocks.phoneVerificationFindMany.mock.calls[0][0].select),
    ).not.toContain("codeHash");
    expect(mocks.agentInsightFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "me" } }),
    );

    const body = await response.text();
    expect(body).not.toContain("must-never-be-exported");
    expect(JSON.parse(body)).toMatchObject({
      export: { complete: true, formatVersion: 2 },
      account: { id: "me", email: "me@example.test" },
    });
  });

  it("conserve le rate-limit et ne lance aucune lecture quand il est dépassé", async () => {
    mocks.rateLimit.mockResolvedValue({ allowed: false });
    const response = await GET();

    expect(response.status).toBe(429);
    expect(mocks.consentFindMany).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      error: "RATE_LIMITED",
    });
  });
});
