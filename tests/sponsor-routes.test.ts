import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  rootFindSponsor: vi.fn(),
  serializable: vi.fn(),
  txFindSponsor: vi.fn(),
  txUpsertSponsor: vi.fn(),
  txDeleteSponsor: vi.fn(),
  txDeleteBlessings: vi.fn(),
}));

vi.mock("@/lib/security/session", () => ({
  requireUser: mocks.requireUser,
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    sponsor: { findUnique: mocks.rootFindSponsor },
  },
}));

const tx = {
  sponsor: {
    findUnique: mocks.txFindSponsor,
    upsert: mocks.txUpsertSponsor,
    deleteMany: mocks.txDeleteSponsor,
  },
  blessing: { deleteMany: mocks.txDeleteBlessings },
};

vi.mock("@/lib/blessing", () => ({
  withSerializableRetry: mocks.serializable,
}));

import {
  DELETE as deleteSponsor,
  POST as saveSponsor,
} from "@/app/api/me/sponsor/route";

const BODY = {
  name: "Marraine",
  email: "marraine@example.test",
  relation: "family",
};

describe("révocation Blessing lors des mutations sponsor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ id: "user-1" });
    mocks.serializable.mockImplementation(
      async (operation: (client: typeof tx) => Promise<unknown>) =>
        operation(tx),
    );
    mocks.txFindSponsor.mockResolvedValue({
      name: "Ancienne marraine",
      email: "old@example.test",
      relation: "friend",
    });
    mocks.txUpsertSponsor.mockResolvedValue(BODY);
    mocks.txDeleteSponsor.mockResolvedValue({ count: 1 });
    mocks.txDeleteBlessings.mockResolvedValue({ count: 1 });
  });

  it("supprime les PENDING dans la même transaction avant un changement", async () => {
    const response = await saveSponsor(
      new Request("https://app.example.test/api/me/sponsor", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(BODY),
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.serializable).toHaveBeenCalledOnce();
    expect(mocks.txDeleteBlessings).toHaveBeenCalledWith({
      where: { userId: "user-1", status: "PENDING" },
    });
    expect(mocks.txUpsertSponsor).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      create: { userId: "user-1", ...BODY },
      update: BODY,
    });
    expect(mocks.txDeleteBlessings.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.txUpsertSponsor.mock.invocationCallOrder[0]!,
    );
  });

  it("ne révoque pas un lien pour une sauvegarde strictement idempotente", async () => {
    mocks.txFindSponsor.mockResolvedValue(BODY);

    const response = await saveSponsor(
      new Request("https://app.example.test/api/me/sponsor", {
        method: "POST",
        body: JSON.stringify(BODY),
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.txDeleteBlessings).not.toHaveBeenCalled();
    expect(mocks.txUpsertSponsor).toHaveBeenCalledOnce();
  });

  it("supprime les PENDING puis le sponsor atomiquement", async () => {
    const response = await deleteSponsor();

    expect(response.status).toBe(200);
    expect(mocks.serializable).toHaveBeenCalledOnce();
    expect(mocks.txDeleteBlessings).toHaveBeenCalledWith({
      where: { userId: "user-1", status: "PENDING" },
    });
    expect(mocks.txDeleteSponsor).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    });
    expect(mocks.txDeleteBlessings.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.txDeleteSponsor.mock.invocationCallOrder[0]!,
    );
  });
});
