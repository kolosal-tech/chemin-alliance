import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  txFindMatch: vi.fn(),
  txFindSponsor: vi.fn(),
  txDeleteBlessings: vi.fn(),
  txFindBlessing: vi.fn(),
  txCreateBlessing: vi.fn(),
  rootDeleteBlessings: vi.fn(),
  rootUpdateBlessings: vi.fn(),
  rootFindUniqueBlessing: vi.fn(),
  rootFindFirstBlessing: vi.fn(),
  encryptField: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    $transaction: mocks.transaction,
    blessing: {
      deleteMany: mocks.rootDeleteBlessings,
      updateMany: mocks.rootUpdateBlessings,
      findUnique: mocks.rootFindUniqueBlessing,
      findFirst: mocks.rootFindFirstBlessing,
    },
  },
}));

vi.mock("@/lib/env", () => ({
  env: { APP_URL: "https://app.example.test/" },
}));

vi.mock("@/lib/email", () => ({
  sendBlessingRequestEmail: vi.fn(),
}));

vi.mock("@/lib/security/crypto", () => ({
  encryptField: mocks.encryptField,
}));

import {
  BlessingDeliveryError,
  BlessingDeliveryInProgressError,
  BlessingNotFoundError,
  BlessingStateChangedError,
  getPendingBlessingView,
  issueBlessingRequest,
  respondToBlessing,
} from "@/lib/blessing";
import { hashBlessingToken } from "@/lib/sponsor";

const NOW = new Date("2026-07-23T10:00:00.000Z");
const TOKEN = "A".repeat(43);
const TOKEN_HASH = hashBlessingToken(TOKEN);

const tx = {
  match: { findFirst: mocks.txFindMatch },
  sponsor: { findUnique: mocks.txFindSponsor },
  blessing: {
    deleteMany: mocks.txDeleteBlessings,
    findFirst: mocks.txFindBlessing,
    create: mocks.txCreateBlessing,
  },
};

describe("cycle sécurisé des bénédictions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(
      async (operation: (client: typeof tx) => Promise<unknown>) =>
        operation(tx),
    );
    mocks.txFindMatch.mockResolvedValue({ id: "match-1" });
    mocks.txFindSponsor.mockResolvedValue({
      id: "sponsor-1",
      email: "sponsor@example.test",
      name: "Marraine",
    });
    mocks.txDeleteBlessings.mockResolvedValue({ count: 0 });
    mocks.txFindBlessing.mockResolvedValue(null);
    mocks.txCreateBlessing.mockResolvedValue({ id: "blessing-1" });
    mocks.rootDeleteBlessings.mockResolvedValue({ count: 1 });
    mocks.rootUpdateBlessings.mockResolvedValue({ count: 1 });
    mocks.rootFindUniqueBlessing.mockResolvedValue({
      id: "blessing-1",
      matchId: "match-1",
      userId: "user-1",
    });
    mocks.rootFindFirstBlessing.mockResolvedValue({
      user: { displayName: "Filleule" },
    });
    mocks.encryptField.mockImplementation((value: string) => `sealed:${value}`);
  });

  it("émet en SERIALIZABLE, ne persiste que le hash et active après email", async () => {
    const deliver = vi.fn().mockResolvedValue(true);

    await expect(
      issueBlessingRequest({
        userId: "user-1",
        displayName: "Filleule",
        locale: "fr",
        matchId: "match-1",
        now: NOW,
        deliverEmail: deliver,
      }),
    ).resolves.toBe("created");

    expect(mocks.transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
    expect(mocks.txFindMatch).toHaveBeenCalledWith({
      where: expect.objectContaining({
        AND: expect.arrayContaining([{ id: "match-1", status: "ACTIVE" }]),
      }),
      select: { id: true },
    });

    const createData = mocks.txCreateBlessing.mock.calls[0]?.[0].data as Record<
      string,
      unknown
    >;
    expect(createData).toMatchObject({
      sponsorId: "sponsor-1",
      matchId: "match-1",
      userId: "user-1",
      tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      expiresAt: new Date("2026-07-26T10:00:00.000Z"),
    });
    expect(createData).not.toHaveProperty("token");

    const emailedLink = deliver.mock.calls[0]?.[3] as string;
    const rawToken = emailedLink.split("/").at(-1);
    expect(rawToken).toHaveLength(43);
    expect(createData.tokenHash).toBe(hashBlessingToken(rawToken!));
    expect(emailedLink).toMatch(/^https:\/\/app\.example\.test\/fr\/parrain\//);

    expect(mocks.rootUpdateBlessings).toHaveBeenCalledWith({
      where: expect.objectContaining({
        id: "blessing-1",
        sponsorId: "sponsor-1",
        tokenHash: createData.tokenHash,
        status: "PENDING",
        emailSentAt: null,
        match: {
          is: expect.objectContaining({
            AND: expect.arrayContaining([{ id: "match-1", status: "ACTIVE" }]),
          }),
        },
      }),
      data: { emailSentAt: expect.any(Date) },
    });
  });

  it("révoque et échoue en 502 logique quand l'email n'est pas confirmé", async () => {
    const deliver = vi.fn().mockResolvedValue(false);

    await expect(
      issueBlessingRequest({
        userId: "user-1",
        displayName: "Filleule",
        locale: "fr",
        matchId: "match-1",
        now: NOW,
        deliverEmail: deliver,
      }),
    ).rejects.toBeInstanceOf(BlessingDeliveryError);

    expect(mocks.rootDeleteBlessings).toHaveBeenCalledWith({
      where: expect.objectContaining({
        id: "blessing-1",
        status: "PENDING",
        emailSentAt: null,
      }),
    });
    expect(mocks.rootUpdateBlessings).not.toHaveBeenCalled();
  });

  it("réutilise uniquement une demande déjà livrée sans produire un second lien", async () => {
    mocks.txFindBlessing.mockResolvedValue({ emailSentAt: NOW });
    const deliver = vi.fn();

    await expect(
      issueBlessingRequest({
        userId: "user-1",
        displayName: "Filleule",
        locale: "fr",
        matchId: "match-1",
        now: NOW,
        deliverEmail: deliver,
      }),
    ).resolves.toBe("already-pending");

    expect(mocks.txCreateBlessing).not.toHaveBeenCalled();
    expect(deliver).not.toHaveBeenCalled();
  });

  it("rejoue le conflit de l'index PENDING puis observe le lien concurrent gagnant", async () => {
    const conflict = new Prisma.PrismaClientKnownRequestError("unique", {
      code: "P2002",
      clientVersion: "test",
    });
    mocks.transaction
      .mockRejectedValueOnce(conflict)
      .mockImplementationOnce(
        async (operation: (client: typeof tx) => Promise<unknown>) => {
          mocks.txFindBlessing.mockResolvedValueOnce({ emailSentAt: NOW });
          return operation(tx);
        },
      );
    const deliver = vi.fn();

    await expect(
      issueBlessingRequest({
        userId: "user-1",
        displayName: "Filleule",
        locale: "fr",
        matchId: "match-1",
        now: NOW,
        deliverEmail: deliver,
      }),
    ).resolves.toBe("already-pending");

    expect(mocks.transaction).toHaveBeenCalledTimes(2);
    expect(mocks.txCreateBlessing).not.toHaveBeenCalled();
    expect(deliver).not.toHaveBeenCalled();
  });

  it("refuse une seconde émission pendant la livraison du premier lien", async () => {
    mocks.txFindBlessing.mockResolvedValue({ emailSentAt: null });

    await expect(
      issueBlessingRequest({
        userId: "user-1",
        displayName: "Filleule",
        locale: "fr",
        matchId: "match-1",
        now: NOW,
        deliverEmail: vi.fn(),
      }),
    ).rejects.toBeInstanceOf(BlessingDeliveryInProgressError);

    expect(mocks.txCreateBlessing).not.toHaveBeenCalled();
  });

  it("ne révèle que le prénom pour un token livré, non expiré et non bloqué", async () => {
    await expect(getPendingBlessingView(TOKEN, NOW)).resolves.toEqual({
      filleulName: "Filleule",
      status: "PENDING",
    });

    expect(mocks.rootFindUniqueBlessing).toHaveBeenCalledWith({
      where: { tokenHash: TOKEN_HASH },
      select: { id: true, matchId: true, userId: true },
    });
    expect(mocks.rootFindFirstBlessing).toHaveBeenCalledWith({
      where: expect.objectContaining({
        tokenHash: TOKEN_HASH,
        status: "PENDING",
        emailSentAt: { not: null },
        expiresAt: { gt: NOW },
        match: {
          is: expect.objectContaining({
            AND: expect.arrayContaining([{ id: "match-1", status: "ACTIVE" }]),
          }),
        },
      }),
      select: {
        user: { select: { displayName: true } },
      },
    });
  });

  it("refuse un token mal formé ou un match devenu fermé/bloqué", async () => {
    await expect(getPendingBlessingView("court", NOW)).rejects.toBeInstanceOf(
      BlessingNotFoundError,
    );
    expect(mocks.rootFindUniqueBlessing).not.toHaveBeenCalled();

    mocks.rootFindFirstBlessing.mockResolvedValue(null);
    await expect(getPendingBlessingView(TOKEN, NOW)).rejects.toBeInstanceOf(
      BlessingNotFoundError,
    );
  });

  it("répond par CAS et efface le bearer dans la même écriture", async () => {
    await respondToBlessing(TOKEN, "caution", "Ralentissez", NOW);

    expect(mocks.rootUpdateBlessings).toHaveBeenCalledWith({
      where: expect.objectContaining({
        id: "blessing-1",
        tokenHash: TOKEN_HASH,
        status: "PENDING",
        emailSentAt: { not: null },
        expiresAt: { gt: NOW },
        match: {
          is: expect.objectContaining({
            AND: expect.arrayContaining([{ id: "match-1", status: "ACTIVE" }]),
          }),
        },
      }),
      data: {
        status: "CAUTION",
        tokenHash: null,
        expiresAt: null,
        noteEncrypted: "sealed:Ralentissez",
        respondedAt: NOW,
      },
    });
  });

  it("une seule des deux réponses concurrentes gagne le CAS", async () => {
    mocks.rootUpdateBlessings
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });

    const outcomes = await Promise.allSettled([
      respondToBlessing(TOKEN, "bless", undefined, NOW),
      respondToBlessing(TOKEN, "caution", undefined, NOW),
    ]);

    expect(
      outcomes.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    const rejected = outcomes.find((result) => result.status === "rejected");
    expect(rejected).toMatchObject({
      status: "rejected",
      reason: expect.any(BlessingStateChangedError),
    });
  });
});
