import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const mocks = vi.hoisted(() => ({
  matchFindFirst: vi.fn(),
  reportFindFirst: vi.fn(),
  reportCreate: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    $transaction: mocks.transaction,
  },
}));

import {
  createContextualReport,
  ReportTargetUnavailableError,
} from "@/lib/reports";

const tx = {
  match: { findFirst: mocks.matchFindFirst },
  report: {
    findFirst: mocks.reportFindFirst,
    create: mocks.reportCreate,
  },
};

describe("createContextualReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(
      async (callback: (client: typeof tx) => unknown) => callback(tx),
    );
    mocks.matchFindFirst.mockResolvedValue({ id: "match-1" });
    mocks.reportFindFirst.mockResolvedValue(null);
    mocks.reportCreate.mockResolvedValue({ id: "report-1" });
  });

  it("rejette une cible sans interaction partagée sans écrire", async () => {
    mocks.matchFindFirst.mockResolvedValue(null);

    await expect(
      createContextualReport("reporter", "target", "motif suffisamment long"),
    ).rejects.toBeInstanceOf(ReportTargetUnavailableError);
    expect(mocks.reportFindFirst).not.toHaveBeenCalled();
    expect(mocks.reportCreate).not.toHaveBeenCalled();
  });

  it("déduplique les signalements OPEN ou REVIEWING", async () => {
    mocks.reportFindFirst.mockResolvedValue({ id: "report-existing" });

    await expect(
      createContextualReport("reporter", "target", "motif suffisamment long"),
    ).resolves.toEqual({ created: false });
    expect(mocks.reportFindFirst).toHaveBeenCalledWith({
      where: {
        reporterId: "reporter",
        targetUserId: "target",
        status: { in: ["OPEN", "REVIEWING"] },
      },
      select: { id: true },
    });
    expect(mocks.reportCreate).not.toHaveBeenCalled();
  });

  it("crée atomiquement un signalement contextualisé", async () => {
    await expect(
      createContextualReport("reporter", "target", "motif suffisamment long"),
    ).resolves.toEqual({ created: true });

    expect(mocks.matchFindFirst).toHaveBeenCalledWith({
      where: {
        OR: [
          { userAId: "reporter", userBId: "target" },
          { userAId: "target", userBId: "reporter" },
        ],
      },
      select: { id: true },
    });
    expect(mocks.reportCreate).toHaveBeenCalledOnce();
    expect(mocks.transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  });
});
