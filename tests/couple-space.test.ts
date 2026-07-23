import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { activeSensitiveDataConsentPairWhere } from "@/lib/sensitive-data-consent";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  rootFindUniqueSpace: vi.fn(),
  rootUpdateManySpace: vi.fn(),
  findUniqueMatch: vi.fn(),
  findFirstMatch: vi.fn(),
  updateManyMatch: vi.fn(),
  findFirstSpace: vi.fn(),
  findUniqueSpace: vi.fn(),
  createSpace: vi.fn(),
  updateManySpace: vi.fn(),
  findFirstUser: vi.fn(),
  updateManyUser: vi.fn(),
  upsertRelationship: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    $transaction: mocks.transaction,
    coupleSpace: {
      findUnique: mocks.rootFindUniqueSpace,
      updateMany: mocks.rootUpdateManySpace,
    },
  },
}));

const tx = {
  match: {
    findUnique: mocks.findUniqueMatch,
    findFirst: mocks.findFirstMatch,
    updateMany: mocks.updateManyMatch,
  },
  coupleSpace: {
    findFirst: mocks.findFirstSpace,
    findUnique: mocks.findUniqueSpace,
    create: mocks.createSpace,
    updateMany: mocks.updateManySpace,
  },
  user: {
    findFirst: mocks.findFirstUser,
    updateMany: mocks.updateManyUser,
  },
  relationshipProfile: {
    upsert: mocks.upsertRelationship,
  },
};

import {
  canonicalCouplePairKey,
  CoupleSpaceError,
  createMatchCoupleSpace,
  expectedNextCoupleSeason,
  hashCoupleInviteCode,
  hashCoupleInviteEmail,
  issueCoupleInvite,
  joinCoupleSpaceByInvite,
  requestCoupleSeasonChange,
} from "@/lib/couple-space";

describe("invariants de l'espace couple", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(
      async (work: (client: typeof tx) => Promise<unknown>) => work(tx),
    );
    mocks.updateManySpace.mockResolvedValue({ count: 1 });
    mocks.updateManyUser.mockResolvedValue({ count: 2 });
    mocks.upsertRelationship.mockResolvedValue({});
  });

  it("construit une paire canonique indépendante du sens", () => {
    expect(canonicalCouplePairKey("user-z", "user-a")).toBe("user-a:user-z");
    expect(canonicalCouplePairKey("user-a", "user-z")).toBe("user-a:user-z");
    expect(() => canonicalCouplePairKey("same", "same")).toThrow(
      CoupleSpaceError,
    );
  });

  it("normalise et sépare les HMAC du code et de l'email", () => {
    const codeHash = hashCoupleInviteCode(" alliance-abc234def567 ");
    expect(codeHash).toBe(hashCoupleInviteCode("ALLIANCE-ABC234DEF567"));
    expect(codeHash).toHaveLength(64);
    expect(codeHash).not.toContain("ABC234DEF567");

    const emailHash = hashCoupleInviteEmail(" Partner@Example.test ");
    expect(emailHash).toBe(hashCoupleInviteEmail("partner@example.test"));
    expect(emailHash).not.toBe(codeHash);
  });

  it("n'autorise que ENGAGED → MARRIED → PARENTS", () => {
    expect(expectedNextCoupleSeason("JOURNEY")).toBeNull();
    expect(expectedNextCoupleSeason("ENGAGED")).toBe("MARRIED");
    expect(expectedNextCoupleSeason("MARRIED")).toBe("PARENTS");
    expect(expectedNextCoupleSeason("PARENTS")).toBeNull();
  });

  it("crée une seule clé canonique depuis un match actif éligible", async () => {
    mocks.findFirstMatch.mockResolvedValue({
      id: "match-1",
      userAId: "user-z",
      userBId: "user-a",
      status: "ACTIVE",
      stage: "COMMITMENT",
    });
    mocks.findUniqueSpace.mockResolvedValue(null);
    mocks.findFirstSpace.mockResolvedValue(null);
    mocks.createSpace.mockResolvedValue({ id: "space-1" });

    await expect(createMatchCoupleSpace("user-z", "match-1")).resolves.toEqual({
      spaceId: "space-1",
      pendingPartner: true,
    });
    expect(mocks.findFirstMatch).toHaveBeenCalledWith({
      where: {
        id: "match-1",
        ...activeSensitiveDataConsentPairWhere,
      },
      select: {
        id: true,
        userAId: true,
        userBId: true,
        status: true,
        stage: true,
      },
    });
    expect(mocks.createSpace).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userAId: "user-z",
        userBId: "user-a",
        pairKey: "user-a:user-z",
        matchId: "match-1",
        status: "PENDING",
      }),
      select: { id: true },
    });
  });

  it("retourne idempotemment un espace match déjà actif sans attente partenaire", async () => {
    mocks.findFirstMatch.mockResolvedValue({
      id: "match-1",
      userAId: "user-a",
      userBId: "user-b",
      status: "CLOSED",
      stage: "CLOSED",
    });
    mocks.findUniqueSpace.mockResolvedValue({
      id: "space-1",
      userAId: "user-a",
      userBId: "user-b",
      status: "ACTIVE",
    });

    await expect(createMatchCoupleSpace("user-a", "match-1")).resolves.toEqual({
      spaceId: "space-1",
      pendingPartner: false,
    });
    expect(mocks.createSpace).not.toHaveBeenCalled();
  });

  it("persiste uniquement le HMAC d'une invitation liée et expirante", async () => {
    mocks.findFirstSpace.mockResolvedValue({ id: "space-1" });
    const now = new Date("2026-07-23T12:00:00.000Z");

    const invite = await issueCoupleInvite(
      "user-a",
      "partner@example.test",
      now,
    );

    expect(invite.code).toMatch(
      /^ALLIANCE-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{12}$/,
    );
    expect(invite.expiresAt.toISOString()).toBe("2026-07-26T12:00:00.000Z");
    expect(mocks.updateManySpace).toHaveBeenCalledWith({
      where: {
        id: "space-1",
        userAId: "user-a",
        userBId: null,
        status: "PENDING",
      },
      data: {
        inviteCode: null,
        inviteCodeHash: invite.codeHash,
        inviteEmailHash: hashCoupleInviteEmail("partner@example.test"),
        inviteExpiresAt: invite.expiresAt,
      },
    });
    expect(JSON.stringify(mocks.updateManySpace.mock.calls)).not.toContain(
      invite.code,
    );
  });

  it("refuse un code absent, expiré ou lié à une autre adresse sans mutation", async () => {
    mocks.findFirstUser.mockResolvedValue({
      id: "user-b",
      email: "wrong@example.test",
      isVerified: true,
      season: "JOURNEY",
    });
    mocks.findFirstSpace.mockResolvedValue(null);

    await expect(
      joinCoupleSpaceByInvite(
        "user-b",
        "ALLIANCE-ABC234DEF567",
        new Date("2026-07-23T12:00:00.000Z"),
      ),
    ).rejects.toMatchObject({ code: "CODE_INVALID", status: 404 });
    expect(mocks.updateManySpace).not.toHaveBeenCalled();
    expect(mocks.updateManyUser).not.toHaveBeenCalled();
  });

  it("enregistre une demande sans modifier les saisons des membres", async () => {
    mocks.findFirstSpace.mockResolvedValue({
      id: "space-1",
      userAId: "user-a",
      userBId: "user-b",
      season: "MARRIED",
      marriedAt: new Date("2025-01-01T00:00:00.000Z"),
      seasonRequestedBy: null,
      seasonRequestedTarget: null,
    });
    const now = new Date("2026-07-23T12:00:00.000Z");

    await expect(
      requestCoupleSeasonChange("user-a", "PARENTS", now),
    ).resolves.toEqual({ state: "REQUESTED", season: "PARENTS" });
    expect(mocks.updateManySpace).toHaveBeenCalledWith({
      where: {
        id: "space-1",
        status: "ACTIVE",
        season: "MARRIED",
        seasonRequestedBy: null,
        seasonRequestedTarget: null,
      },
      data: {
        seasonRequestedBy: "user-a",
        seasonRequestedTarget: "PARENTS",
        seasonRequestedAt: now,
      },
    });
    expect(mocks.updateManyUser).not.toHaveBeenCalled();
    expect(mocks.upsertRelationship).not.toHaveBeenCalled();
  });

  it("applique la transition seulement quand l'autre membre confirme", async () => {
    mocks.findFirstSpace.mockResolvedValue({
      id: "space-1",
      userAId: "user-a",
      userBId: "user-b",
      season: "MARRIED",
      marriedAt: new Date("2025-01-01T00:00:00.000Z"),
      seasonRequestedBy: "user-a",
      seasonRequestedTarget: "PARENTS",
    });

    await expect(
      requestCoupleSeasonChange("user-b", "PARENTS"),
    ).resolves.toEqual({ state: "ADVANCED", season: "PARENTS" });
    expect(mocks.updateManyUser).toHaveBeenCalledWith({
      where: {
        id: { in: ["user-a", "user-b"] },
        deletedAt: null,
      },
      data: { season: "PARENTS" },
    });
    expect(mocks.upsertRelationship).toHaveBeenCalledTimes(2);
  });

  it("refuse toute régression et toute étape sautée", async () => {
    mocks.findFirstSpace.mockResolvedValue({
      id: "space-1",
      userAId: "user-a",
      userBId: "user-b",
      season: "PARENTS",
      marriedAt: new Date(),
      seasonRequestedBy: null,
      seasonRequestedTarget: null,
    });

    await expect(
      requestCoupleSeasonChange("user-a", "MARRIED"),
    ).rejects.toMatchObject({ code: "INVALID_TRANSITION", status: 409 });
    expect(mocks.updateManySpace).not.toHaveBeenCalled();
  });

  it("rejoue un conflit de sérialisation avant d'enregistrer la demande", async () => {
    const conflict = new Prisma.PrismaClientKnownRequestError("conflict", {
      code: "P2034",
      clientVersion: "test",
    });
    mocks.transaction
      .mockRejectedValueOnce(conflict)
      .mockImplementationOnce(
        async (work: (client: typeof tx) => Promise<unknown>) => work(tx),
      );
    mocks.findFirstSpace.mockResolvedValue({
      id: "space-1",
      userAId: "user-a",
      userBId: "user-b",
      season: "MARRIED",
      marriedAt: new Date(),
      seasonRequestedBy: null,
      seasonRequestedTarget: null,
    });

    await requestCoupleSeasonChange("user-a", "PARENTS");

    expect(mocks.transaction).toHaveBeenCalledTimes(2);
  });
});
