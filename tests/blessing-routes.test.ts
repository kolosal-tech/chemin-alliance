import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  requireActiveMatch: vi.fn(),
  rateLimit: vi.fn(),
  issueBlessing: vi.fn(),
  getBlessing: vi.fn(),
  respondBlessing: vi.fn(),
}));

vi.mock("@/lib/security/session", () => ({
  requireUser: mocks.requireUser,
}));

vi.mock("@/lib/alliance", () => ({
  requireActiveMatchMember: mocks.requireActiveMatch,
}));

vi.mock("@/lib/security/rate-limit", () => ({
  rateLimit: mocks.rateLimit,
  LIMITS: {
    invite: { limit: 5, windowMs: 60_000 },
    tokenLookup: { limit: 20, windowMs: 60_000 },
  },
}));

vi.mock("@/lib/blessing", () => {
  class BlessingDeliveryError extends Error {}
  class BlessingDeliveryInProgressError extends Error {}
  class BlessingSponsorMissingError extends Error {}
  class BlessingStateChangedError extends Error {}
  class BlessingNotFoundError extends Error {
    readonly status = 404;
  }

  return {
    BlessingDeliveryError,
    BlessingDeliveryInProgressError,
    BlessingSponsorMissingError,
    BlessingStateChangedError,
    BlessingNotFoundError,
    issueBlessingRequest: mocks.issueBlessing,
    getPendingBlessingView: mocks.getBlessing,
    respondToBlessing: mocks.respondBlessing,
  };
});

import {
  BlessingDeliveryError,
  BlessingDeliveryInProgressError,
  BlessingNotFoundError,
  BlessingSponsorMissingError,
  BlessingStateChangedError,
} from "@/lib/blessing";
import { POST as issueBlessing } from "@/app/api/matches/[matchId]/blessing/route";
import {
  GET as getBlessing,
  POST as respondBlessing,
} from "@/app/api/blessing/[token]/route";

const user = {
  id: "user-1",
  displayName: "Filleule",
  locale: "fr",
};
const matchParams = { params: Promise.resolve({ matchId: "match-1" }) };
const tokenParams = { params: Promise.resolve({ token: "A".repeat(43) }) };

describe("routes Blessing durcies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue(user);
    mocks.requireActiveMatch.mockResolvedValue({ id: "match-1" });
    mocks.rateLimit.mockResolvedValue({ allowed: true });
    mocks.issueBlessing.mockResolvedValue("created");
    mocks.getBlessing.mockResolvedValue({
      filleulName: "Filleule",
      status: "PENDING",
    });
    mocks.respondBlessing.mockResolvedValue(undefined);
  });

  it("réévalue le match et délègue l'émission transactionnelle", async () => {
    const response = await issueBlessing(
      new Request("https://app.example.test", { method: "POST" }),
      matchParams,
    );

    expect(response.status).toBe(200);
    expect(mocks.requireActiveMatch).toHaveBeenCalledWith("match-1", "user-1");
    expect(mocks.issueBlessing).toHaveBeenCalledWith({
      userId: "user-1",
      displayName: "Filleule",
      locale: "fr",
      matchId: "match-1",
    });
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("annonce explicitement l'échec email en 502", async () => {
    mocks.issueBlessing.mockRejectedValue(new BlessingDeliveryError());

    const response = await issueBlessing(
      new Request("https://app.example.test", { method: "POST" }),
      matchParams,
    );

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "BLESSING_EMAIL_DELIVERY_FAILED",
    });
  });

  it.each([
    [new BlessingSponsorMissingError(), 409, "NO_SPONSOR"] as const,
    [
      new BlessingDeliveryInProgressError(),
      503,
      "BLESSING_EMAIL_DELIVERY_IN_PROGRESS",
    ] as const,
    [new BlessingStateChangedError(), 409, "MATCH_STATE_CHANGED"] as const,
  ])(
    "convertit les états d'émission sans faux succès",
    async (error, status, code) => {
      mocks.issueBlessing.mockRejectedValue(error);

      const response = await issueBlessing(
        new Request("https://app.example.test", { method: "POST" }),
        matchParams,
      );

      expect(response.status).toBe(status);
      await expect(response.json()).resolves.toEqual({ error: code });
    },
  );

  it("renvoie le DTO public minimal sans nom du sponsor", async () => {
    const response = await getBlessing(
      new Request("https://app.example.test/api/blessing/token"),
      tokenParams,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      filleulName: "Filleule",
      status: "PENDING",
    });
  });

  it("soumet la décision au CAS et conserve la note bornée", async () => {
    const response = await respondBlessing(
      new Request("https://app.example.test/api/blessing/token", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision: "bless", note: "  Avec joie  " }),
      }),
      tokenParams,
    );

    expect(response.status).toBe(200);
    expect(mocks.respondBlessing).toHaveBeenCalledWith(
      "A".repeat(43),
      "bless",
      "Avec joie",
    );
  });

  it("renvoie 409 au CAS perdu et 404 pour un bearer invalide", async () => {
    mocks.respondBlessing.mockRejectedValueOnce(
      new BlessingStateChangedError(),
    );
    const raced = await respondBlessing(
      new Request("https://app.example.test/api/blessing/token", {
        method: "POST",
        body: JSON.stringify({ decision: "caution" }),
      }),
      tokenParams,
    );
    expect(raced.status).toBe(409);

    mocks.getBlessing.mockRejectedValueOnce(new BlessingNotFoundError());
    const missing = await getBlessing(
      new Request("https://app.example.test/api/blessing/token"),
      tokenParams,
    );
    expect(missing.status).toBe(404);
  });
});
