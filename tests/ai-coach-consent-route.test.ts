import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  getActive: vi.fn(),
  grant: vi.fn(),
  revoke: vi.fn(),
}));

const errors = vi.hoisted(() => ({
  Superseded: class Superseded extends Error {},
}));

vi.mock("@/lib/security/session", () => ({
  requireUser: mocks.requireUser,
}));

vi.mock("@/lib/ai-coach/consent", () => ({
  AiCoachConsentSupersededError: errors.Superseded,
  getActiveAiCoachConsent: mocks.getActive,
  grantAiCoachConsent: mocks.grant,
  revokeAiCoachConsent: mocks.revoke,
  aiCoachConsentDto: (consent: { grantedAt: Date } | null) => ({
    active: Boolean(consent),
    type: "AI_COACH_INTERACTION",
    version: "current-v1",
    purpose: "INTERACTIVE_DISCERNMENT_SUPPORT",
    recipient: `sha256:${"a".repeat(64)}`,
    recipientSummary: "LOCAL_ONLY",
    grantedAt: consent?.grantedAt.toISOString() ?? null,
  }),
}));

import { DELETE, GET, POST } from "@/app/api/me/consents/ai-coach/route";

const ACTIVE = {
  id: "consent-1",
  grantedAt: new Date("2026-07-23T11:00:00.000Z"),
};

describe("/api/me/consents/ai-coach", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({
      id: "user-1",
      isVerified: true,
    });
  });

  it("expose un état non cachable", async () => {
    mocks.getActive.mockResolvedValue(ACTIVE);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe(
      "private, no-store, max-age=0",
    );
    await expect(response.json()).resolves.toMatchObject({
      active: true,
      type: "AI_COACH_INTERACTION",
      grantedAt: "2026-07-23T11:00:00.000Z",
    });
  });

  it("refuse le recueil avant vérification de l'email", async () => {
    mocks.requireUser.mockResolvedValue({
      id: "user-1",
      isVerified: false,
    });

    const response = await POST();

    expect(response.status).toBe(403);
    expect(mocks.grant).not.toHaveBeenCalled();
  });

  it("recueille le périmètre serveur sans lire de body", async () => {
    mocks.grant.mockResolvedValue(ACTIVE);

    const response = await POST();

    expect(response.status).toBe(200);
    expect(mocks.grant).toHaveBeenCalledWith("user-1");
    await expect(response.json()).resolves.toMatchObject({ active: true });
  });

  it("refuse un grant en vol dépassé par un retrait", async () => {
    mocks.grant.mockRejectedValue(new errors.Superseded());

    const response = await POST();

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: "AI_COACH_CONSENT_OPERATION_SUPERSEDED",
    });
  });

  it("révoque sans supprimer le compte", async () => {
    mocks.revoke.mockResolvedValue(new Date());

    const response = await DELETE();

    expect(response.status).toBe(200);
    expect(mocks.revoke).toHaveBeenCalledWith("user-1");
    await expect(response.json()).resolves.toEqual({
      ok: true,
      active: false,
    });
  });
});
