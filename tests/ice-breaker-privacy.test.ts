import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  requireActiveMatchMember: vi.fn(),
  rateLimit: vi.fn(),
  findUser: vi.fn(),
  callLLM: vi.fn(),
}));

vi.mock("@/lib/security/session", () => ({
  requireUser: mocks.requireUser,
}));

vi.mock("@/lib/alliance", () => ({
  requireActiveMatchMember: mocks.requireActiveMatchMember,
}));

vi.mock("@/lib/security/rate-limit", () => ({
  rateLimit: mocks.rateLimit,
  LIMITS: { icebreaker: { limit: 6, windowMs: 60_000 } },
}));

vi.mock("@/lib/db", () => ({
  prisma: { user: { findUnique: mocks.findUser } },
}));

vi.mock("@/lib/llm/gateway", () => ({
  callLLM: mocks.callLLM,
}));

import { POST } from "@/app/api/matches/[matchId]/ice-breaker/route";

describe("ice-breaker sans profil ni LLM", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({
      id: "user-a",
      isVerified: true,
      locale: "fr",
    });
    mocks.requireActiveMatchMember.mockResolvedValue({
      id: "match-1",
      userAId: "user-a",
      userBId: "user-b",
      compatibilityJson: { private: "SECRET_MARKER_profile" },
    });
    mocks.rateLimit.mockResolvedValue({ allowed: true });
    mocks.findUser.mockResolvedValue({ kind: "MEMBER" });
  });

  it("ne charge que le type du correspondant et renvoie une question locale", async () => {
    const response = await POST(new Request("https://app.test"), {
      params: Promise.resolve({ matchId: "match-1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.question).toEqual(expect.any(String));
    expect(payload.question).not.toContain("SECRET_MARKER");
    expect(mocks.findUser).toHaveBeenCalledWith({
      where: { id: "user-b" },
      select: { kind: true },
    });
    expect(mocks.callLLM).not.toHaveBeenCalled();
  });
});
