import { beforeEach, describe, expect, it, vi } from "vitest";
import { unblockedMatchWhere } from "@/lib/blocks";
import { activeSensitiveDataConsentPairWhere } from "@/lib/sensitive-data-consent";

const mocks = vi.hoisted(() => ({
  matchFindFirst: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    match: { findFirst: mocks.matchFindFirst },
  },
}));

import {
  activeMatchMemberWhere,
  pendingMatchDecisionWhere,
  pendingMatchDecisionsWhere,
  requireActiveMatchMember,
  requireClosableMatchMember,
  requirePendingMatchDecisionMember,
} from "@/lib/alliance";

describe("frontière centrale d'accès Match", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exige ACTIVE et l'absence de blocage pour toute interaction sensible", () => {
    expect(activeMatchMemberWhere("match-1", "user-a")).toEqual({
      AND: [
        { id: "match-1", status: "ACTIVE" },
        activeSensitiveDataConsentPairWhere,
        unblockedMatchWhere("user-a"),
      ],
    });
  });

  it("isole explicitement la lecture minimale PENDING de décision", () => {
    expect(pendingMatchDecisionWhere("match-1", "user-a")).toEqual({
      AND: [
        { id: "match-1", status: "PENDING" },
        activeSensitiveDataConsentPairWhere,
        unblockedMatchWhere("user-a"),
      ],
    });
    expect(pendingMatchDecisionsWhere("user-a")).toEqual({
      AND: [
        { status: "PENDING" },
        activeSensitiveDataConsentPairWhere,
        unblockedMatchWhere("user-a"),
      ],
    });
  });

  it("refuse PENDING, CLOSED, outsider ou bloqué sans révéler la cause", async () => {
    mocks.matchFindFirst.mockResolvedValue(null);

    for (const id of [
      "pending-match",
      "closed-match",
      "outsider-match",
      "blocked-match",
    ]) {
      await expect(
        requireActiveMatchMember(id, "user-a"),
      ).rejects.toMatchObject({ status: 404 });
    }
    expect(mocks.matchFindFirst).toHaveBeenCalledTimes(4);
  });

  it("n'autorise l'acceptation/refus que via la garde PENDING non bloquée", async () => {
    const pending = {
      id: "match-1",
      userAId: "user-a",
      userBId: "user-b",
      status: "PENDING",
    };
    mocks.matchFindFirst.mockResolvedValue(pending);

    await expect(
      requirePendingMatchDecisionMember("match-1", "user-a"),
    ).resolves.toBe(pending);
    expect(mocks.matchFindFirst).toHaveBeenLastCalledWith({
      where: pendingMatchDecisionWhere("match-1", "user-a"),
      select: {
        id: true,
        status: true,
        requestedById: true,
      },
    });
  });

  it("réserve la garde mixte ACTIVE/PENDING à la clôture", async () => {
    const active = {
      id: "match-1",
      userAId: "user-a",
      userBId: "user-b",
      status: "ACTIVE",
    };
    mocks.matchFindFirst.mockResolvedValue(active);

    await expect(requireClosableMatchMember("match-1", "user-a")).resolves.toBe(
      active,
    );
    expect(mocks.matchFindFirst).toHaveBeenLastCalledWith({
      where: {
        AND: [
          {
            id: "match-1",
            status: { in: ["ACTIVE", "PENDING"] },
          },
          activeSensitiveDataConsentPairWhere,
          unblockedMatchWhere("user-a"),
        ],
      },
      select: {
        id: true,
        status: true,
        requestedById: true,
      },
    });
  });
});
