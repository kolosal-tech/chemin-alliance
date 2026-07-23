import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuthenticatedUser: vi.fn(),
  getState: vi.fn(),
  grant: vi.fn(),
  revoke: vi.fn(),
}));

const errors = vi.hoisted(() => ({
  Superseded: class Superseded extends Error {},
}));

vi.mock("@/lib/security/session", () => ({
  requireAuthenticatedUser: mocks.requireAuthenticatedUser,
}));

vi.mock("@/lib/sensitive-data-consent", () => ({
  SensitiveDataConsentSupersededError: errors.Superseded,
  getSensitiveDataConsentState: mocks.getState,
  grantSensitiveDataConsent: mocks.grant,
  revokeSensitiveDataConsent: mocks.revoke,
}));

import { DELETE, GET, POST } from "@/app/api/me/consents/sensitive-data/route";

describe("/api/me/consents/sensitive-data", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuthenticatedUser.mockResolvedValue({ id: "user-1" });
  });

  it("expose un état privé même après retrait", async () => {
    mocks.getState.mockResolvedValue({
      active: false,
      grantedAt: null,
      version: "sensitive-data-processing:v1",
    });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe(
      "private, no-store, max-age=0",
    );
    await expect(response.json()).resolves.toMatchObject({ active: false });
  });

  it("recueille le périmètre exclusivement défini par le serveur", async () => {
    mocks.grant.mockResolvedValue({
      id: "consent-1",
      grantedAt: new Date("2026-07-23T20:00:00.000Z"),
      version: "sensitive-data-processing:v1",
    });

    const response = await POST();

    expect(response.status).toBe(200);
    expect(mocks.grant).toHaveBeenCalledWith("user-1");
    await expect(response.json()).resolves.toMatchObject({
      active: true,
      version: "sensitive-data-processing:v1",
    });
  });

  it("refuse qu'un recueil en vol dépasse un retrait concurrent", async () => {
    mocks.grant.mockRejectedValue(new errors.Superseded());

    const response = await POST();

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "SENSITIVE_DATA_CONSENT_OPERATION_SUPERSEDED",
    });
  });

  it("retire sans supprimer le compte", async () => {
    mocks.revoke.mockResolvedValue(new Date("2026-07-23T20:10:00.000Z"));

    const response = await DELETE();

    expect(response.status).toBe(200);
    expect(mocks.revoke).toHaveBeenCalledWith("user-1");
    await expect(response.json()).resolves.toMatchObject({ active: false });
  });
});
