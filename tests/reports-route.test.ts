import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  rateLimit: vi.fn(),
  createContextualReport: vi.fn(),
}));

vi.mock("@/lib/security/session", () => ({
  requireUser: mocks.requireUser,
}));
vi.mock("@/lib/security/rate-limit", () => ({
  LIMITS: { report: { limit: 12, windowMs: 3_600_000 } },
  rateLimit: mocks.rateLimit,
}));
vi.mock("@/lib/reports", () => ({
  createContextualReport: mocks.createContextualReport,
}));

import { POST } from "@/app/api/reports/route";

function request(targetUserId = "target") {
  return new Request("https://app.test/api/reports", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      targetUserId,
      reason: "Comportement préoccupant et contextualisé.",
    }),
  });
}

describe("POST /api/reports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({
      id: "reporter",
      isVerified: true,
    });
    mocks.rateLimit.mockResolvedValue({ allowed: true });
    mocks.createContextualReport.mockResolvedValue({ created: true });
  });

  it("exige un compte vérifié avant de consommer le quota", async () => {
    mocks.requireUser.mockResolvedValue({
      id: "reporter",
      isVerified: false,
    });

    const response = await POST(request());

    expect(response.status).toBe(403);
    expect(mocks.rateLimit).not.toHaveBeenCalled();
    expect(mocks.createContextualReport).not.toHaveBeenCalled();
  });

  it("crée le signalement via la frontière contextualisée", async () => {
    const response = await POST(request());

    expect(response.status).toBe(201);
    expect(mocks.createContextualReport).toHaveBeenCalledWith(
      "reporter",
      "target",
      "Comportement préoccupant et contextualisé.",
    );
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("reste idempotent quand un signalement qualifiable existe", async () => {
    mocks.createContextualReport.mockResolvedValue({ created: false });

    const response = await POST(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      alreadyReported: true,
    });
  });

  it("rejette l'auto-signalement sans mutation", async () => {
    const response = await POST(request("reporter"));

    expect(response.status).toBe(400);
    expect(mocks.createContextualReport).not.toHaveBeenCalled();
  });
});
