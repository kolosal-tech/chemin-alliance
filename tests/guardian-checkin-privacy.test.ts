import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  rateLimit: vi.fn(),
  findSpace: vi.fn(),
  findInsight: vi.fn(),
  createInsight: vi.fn(),
  completeText: vi.fn(),
}));

vi.mock("@/lib/security/session", () => ({
  requireUser: mocks.requireUser,
}));

vi.mock("@/lib/security/rate-limit", () => ({
  rateLimit: mocks.rateLimit,
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    coupleSpace: { findFirst: mocks.findSpace },
    agentInsight: {
      findFirst: mocks.findInsight,
      create: mocks.createInsight,
    },
  },
}));

vi.mock("@/lib/agent-insight", () => ({
  sealInsight: vi.fn((value: unknown) => value),
}));

vi.mock("@/lib/agents/llm", () => ({
  completeText: mocks.completeText,
}));

import { POST } from "@/app/api/agents/guardian/checkin/route";

describe("check-in Gardien local et privé", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({
      id: "user-a",
      locale: "fr",
      country: "FR",
    });
    mocks.rateLimit.mockResolvedValue({ allowed: true });
    mocks.findSpace.mockResolvedValue({
      id: "space-1",
      season: "MARRIED",
    });
    mocks.createInsight.mockResolvedValue({ id: "insight-1" });
  });

  it("ne relit pas la note précédente et ne renvoie jamais la note libre", async () => {
    const secret = "SECRET_MARKER_checkin";
    const response = await POST(
      new Request("https://app.test/api/agents/guardian/checkin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          answers: [
            {
              id: "chk_time_together",
              value: "no",
              note: secret,
            },
          ],
        }),
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.word).not.toContain(secret);
    expect(mocks.findInsight).not.toHaveBeenCalled();
    expect(mocks.completeText).not.toHaveBeenCalled();
  });
});
