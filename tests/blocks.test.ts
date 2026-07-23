import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  findFirstUser: vi.fn(),
  upsertBlock: vi.fn(),
  updateManyMatches: vi.fn(),
  deleteManyBlessings: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    $transaction: mocks.transaction,
    block: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

import {
  accessibleConversationWhere,
  blockUserAndCloseMatches,
  BlockTargetNotFoundError,
  unblockedMatchWhere,
} from "@/lib/blocks";
import { activeSensitiveDataConsentPairWhere } from "@/lib/sensitive-data-consent";

const tx = {
  user: { findFirst: mocks.findFirstUser },
  block: { upsert: mocks.upsertBlock },
  match: { updateMany: mocks.updateManyMatches },
  blessing: { deleteMany: mocks.deleteManyBlessings },
};

describe("blocage relationnel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findFirstUser.mockResolvedValue({ id: "user-b" });
    mocks.upsertBlock.mockResolvedValue({ id: "block-1" });
    mocks.updateManyMatches.mockResolvedValue({ count: 1 });
    mocks.deleteManyBlessings.mockResolvedValue({ count: 1 });
    mocks.transaction.mockImplementation(
      async (work: (client: typeof tx) => Promise<void>) => work(tx),
    );
  });

  it("construit un filtre symétrique qui exclut blocage entrant et sortant", () => {
    expect(unblockedMatchWhere("user-a")).toEqual({
      OR: [
        {
          userAId: "user-a",
          userB: {
            is: {
              blocksMade: { none: { blockedId: "user-a" } },
              blocksReceived: { none: { blockerId: "user-a" } },
            },
          },
        },
        {
          userBId: "user-a",
          userA: {
            is: {
              blocksMade: { none: { blockedId: "user-a" } },
              blocksReceived: { none: { blockerId: "user-a" } },
            },
          },
        },
      ],
    });
  });

  it("réserve les conversations au statut ACTIVE", () => {
    expect(accessibleConversationWhere("match-1", "user-a")).toEqual({
      AND: [
        { id: "match-1", status: "ACTIVE" },
        activeSensitiveDataConsentPairWhere,
        unblockedMatchWhere("user-a"),
      ],
    });
  });

  it("crée le blocage et ferme la relation dans une transaction sérialisable", async () => {
    await blockUserAndCloseMatches("user-a", "user-b");

    expect(mocks.transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
    expect(mocks.upsertBlock).toHaveBeenCalledWith({
      where: {
        blockerId_blockedId: {
          blockerId: "user-a",
          blockedId: "user-b",
        },
      },
      create: { blockerId: "user-a", blockedId: "user-b" },
      update: {},
    });
    expect(mocks.updateManyMatches).toHaveBeenCalledWith({
      where: {
        status: { not: "CLOSED" },
        OR: [
          { userAId: "user-a", userBId: "user-b" },
          { userAId: "user-b", userBId: "user-a" },
        ],
      },
      data: {
        stage: "CLOSED",
        status: "CLOSED",
        closedBy: "user-a",
        closeMessage: null,
        contactExchange: "REVOKED",
        contactExchangeRequestedBy: null,
        advanceRequestedBy: null,
      },
    });
    expect(mocks.deleteManyBlessings).toHaveBeenCalledWith({
      where: {
        status: "PENDING",
        match: {
          is: {
            OR: [
              { userAId: "user-a", userBId: "user-b" },
              { userAId: "user-b", userBId: "user-a" },
            ],
          },
        },
      },
    });
  });

  it("échoue fermée sans créer de blocage pour une cible absente", async () => {
    mocks.findFirstUser.mockResolvedValue(null);

    await expect(
      blockUserAndCloseMatches("user-a", "missing"),
    ).rejects.toBeInstanceOf(BlockTargetNotFoundError);
    expect(mocks.upsertBlock).not.toHaveBeenCalled();
    expect(mocks.updateManyMatches).not.toHaveBeenCalled();
    expect(mocks.deleteManyBlessings).not.toHaveBeenCalled();
  });

  it("rejoue un conflit de sérialisation puis applique le blocage", async () => {
    const conflict = new Prisma.PrismaClientKnownRequestError("conflict", {
      code: "P2034",
      clientVersion: "test",
    });
    mocks.transaction
      .mockRejectedValueOnce(conflict)
      .mockImplementationOnce(
        async (work: (client: typeof tx) => Promise<void>) => work(tx),
      );

    await blockUserAndCloseMatches("user-a", "user-b");

    expect(mocks.transaction).toHaveBeenCalledTimes(2);
    expect(mocks.upsertBlock).toHaveBeenCalledOnce();
    expect(mocks.updateManyMatches).toHaveBeenCalledOnce();
    expect(mocks.deleteManyBlessings).toHaveBeenCalledOnce();
  });
});
