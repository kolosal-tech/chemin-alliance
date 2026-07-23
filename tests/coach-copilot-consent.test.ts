import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  requireActiveMatchMember: vi.fn(),
  rateLimit: vi.fn(),
  completeText: vi.fn(),
  consentFindFirst: vi.fn(),
  consentCreate: vi.fn(),
  answersFindMany: vi.fn(),
  insightCreate: vi.fn(),
}));

vi.mock("@/lib/security/session", () => ({
  requireUser: mocks.requireUser,
}));

vi.mock("@/lib/alliance", () => ({
  requireActiveMatchMember: mocks.requireActiveMatchMember,
}));

vi.mock("@/lib/security/rate-limit", () => ({
  rateLimit: mocks.rateLimit,
}));

vi.mock("@/lib/agents/llm", () => ({
  completeText: mocks.completeText,
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    consent: {
      findFirst: mocks.consentFindFirst,
      create: mocks.consentCreate,
    },
    allianceAnswer: { findMany: mocks.answersFindMany },
    agentInsight: { create: mocks.insightCreate },
  },
}));

import { POST } from "@/app/api/agents/coach-copilot/route";

describe("copilote coach fail-closed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ id: "user-a" });
    mocks.requireActiveMatchMember.mockResolvedValue({
      id: "match-1",
      userAId: "user-a",
      userBId: "user-b",
      status: "ACTIVE",
    });
    mocks.rateLimit.mockResolvedValue({ allowed: true });
  });

  it("retourne 503 sans lire de réponses ni créer de consentement générique", async () => {
    const response = await POST(
      new Request("https://app.test/api/agents/coach-copilot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ matchId: "match-1", consent: true }),
      }),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: "SCOPED_CONSENT_REQUIRED",
    });
    expect(mocks.consentFindFirst).not.toHaveBeenCalled();
    expect(mocks.consentCreate).not.toHaveBeenCalled();
    expect(mocks.answersFindMany).not.toHaveBeenCalled();
    expect(mocks.insightCreate).not.toHaveBeenCalled();
    expect(mocks.completeText).not.toHaveBeenCalled();
  });
});
