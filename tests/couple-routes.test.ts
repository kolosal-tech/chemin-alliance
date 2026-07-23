import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  rateLimit: vi.fn(),
  requestSeason: vi.fn(),
  issueInvite: vi.fn(),
  revokeInvite: vi.fn(),
  joinInvite: vi.fn(),
  confirmMatch: vi.fn(),
  sendEmail: vi.fn(),
}));

vi.mock("@/lib/security/session", () => ({
  requireUser: mocks.requireUser,
}));

vi.mock("@/lib/security/rate-limit", () => ({
  LIMITS: {
    invite: { limit: 5, windowMs: 60_000 },
    coupleJoin: { limit: 5, windowMs: 60_000 },
  },
  rateLimit: mocks.rateLimit,
}));

vi.mock("@/lib/couple-space", () => {
  class CoupleSpaceError extends Error {
    status = 409;
    constructor(readonly code: string) {
      super(code);
    }
  }
  return {
    CoupleSpaceError,
    requestCoupleSeasonChange: mocks.requestSeason,
    issueCoupleInvite: mocks.issueInvite,
    revokeCoupleInvite: mocks.revokeInvite,
    joinCoupleSpaceByInvite: mocks.joinInvite,
    confirmMatchCoupleSpace: mocks.confirmMatch,
  };
});

vi.mock("@/lib/email", () => ({
  sendCoupleInviteEmail: mocks.sendEmail,
}));

vi.mock("@/lib/env", () => ({
  env: { NODE_ENV: "test" },
}));

import { POST as confirmCouple } from "@/app/api/couple/confirm/route";
import { POST as inviteCouple } from "@/app/api/couple/invite/route";
import { POST as joinCouple } from "@/app/api/couple/join/route";
import { PATCH as changeSeason } from "@/app/api/couple/season/route";

function jsonRequest(path: string, method: string, body: unknown) {
  return new Request(`https://app.test${path}`, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("autorisation des routes Espace Couple", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({
      id: "user-a",
      email: "owner@example.test",
      displayName: "Owner",
      locale: "fr",
    });
    mocks.rateLimit.mockResolvedValue({ allowed: true });
    mocks.requestSeason.mockResolvedValue({
      state: "REQUESTED",
      season: "PARENTS",
    });
    mocks.issueInvite.mockResolvedValue({
      code: "ALLIANCE-ABC234DEF567",
      codeHash: "hash",
      expiresAt: new Date("2026-07-26T12:00:00.000Z"),
      spaceId: "space-1",
    });
    mocks.sendEmail.mockResolvedValue(true);
    mocks.joinInvite.mockResolvedValue({ spaceId: "space-1" });
    mocks.confirmMatch.mockResolvedValue({ spaceId: "space-1" });
  });

  it("refuse une transition sans session avant toute mutation", async () => {
    mocks.requireUser.mockRejectedValue(
      Object.assign(new Error("UNAUTHORIZED"), { status: 401 }),
    );

    const response = await changeSeason(
      jsonRequest("/api/couple/season", "PATCH", { season: "PARENTS" }),
    );

    expect(response.status).toBe(401);
    expect(mocks.requestSeason).not.toHaveBeenCalled();
  });

  it("transmet uniquement l'identité de session au protocole bilatéral", async () => {
    const response = await changeSeason(
      jsonRequest("/api/couple/season", "PATCH", { season: "PARENTS" }),
    );

    expect(response.status).toBe(200);
    expect(mocks.requestSeason).toHaveBeenCalledWith("user-a", "PARENTS");
    await expect(response.json()).resolves.toEqual({
      ok: true,
      state: "REQUESTED",
      season: "PARENTS",
    });
  });

  it("interdit une invitation vers l'adresse du créateur", async () => {
    const response = await inviteCouple(
      jsonRequest("/api/couple/invite", "POST", {
        email: "OWNER@example.test",
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.issueInvite).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("émet le code une seule fois sans cache pour le créateur authentifié", async () => {
    const response = await inviteCouple(
      jsonRequest("/api/couple/invite", "POST", {
        email: "partner@example.test",
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(mocks.issueInvite).toHaveBeenCalledWith(
      "user-a",
      "partner@example.test",
    );
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      delivered: true,
      code: "ALLIANCE-ABC234DEF567",
    });
  });

  it("borne les tentatives de consommation avant de consulter le code", async () => {
    mocks.rateLimit.mockResolvedValue({ allowed: false });

    const response = await joinCouple(
      jsonRequest("/api/couple/join", "POST", {
        code: "ALLIANCE-ABC234DEF567",
      }),
    );

    expect(response.status).toBe(429);
    expect(mocks.joinInvite).not.toHaveBeenCalled();
  });

  it("confirme un espace de match uniquement pour l'identité de session", async () => {
    const response = await confirmCouple();

    expect(response.status).toBe(200);
    expect(mocks.confirmMatch).toHaveBeenCalledWith("user-a");
  });
});
