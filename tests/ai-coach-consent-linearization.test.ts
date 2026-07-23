import { beforeEach, describe, expect, it, vi } from "vitest";

type Deferred<T = void> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
};

function deferred<T = void>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

const harness = vi.hoisted(() => {
  type RecordRow = {
    id: string;
    userId: string;
    type: string;
    version: string | null;
    purpose: string | null;
    recipient: string | null;
    grantedAt: Date;
    revokedAt: Date | null;
  };
  type FindFirstWhere = {
    userId?: string;
    type?: string;
    version?: string;
    purpose?: string;
    recipient?: string;
    revokedAt?: null | { gte: Date };
  };

  let locked = false;
  const waiters: Array<(release: () => void) => void> = [];
  let sequence = 0;
  let pauseClock: { entered: () => void; wait: Promise<void> } | undefined;

  const acquire = async (): Promise<() => void> => {
    if (!locked) {
      locked = true;
      return () => {
        const next = waiters.shift();
        if (next) next(() => release());
        else locked = false;
      };
    }
    return new Promise((resolve) => waiters.push(resolve));
  };

  const release = () => {
    const next = waiters.shift();
    if (next) next(() => release());
    else locked = false;
  };

  const state = {
    records: [] as RecordRow[],
    pauseNextClock(entered: () => void, wait: Promise<void>) {
      pauseClock = { entered, wait };
    },
    reset() {
      locked = false;
      waiters.splice(0);
      sequence = 0;
      pauseClock = undefined;
      state.records.splice(0);
      findFirst.mockClear();
      updateMany.mockClear();
      update.mockClear();
      create.mockClear();
      leaseFindMany.mockClear();
      queryRaw.mockClear();
      transaction.mockClear();
    },
  };

  const findFirst = vi.fn(async ({ where }: { where: FindFirstWhere }) => {
    const matches = state.records
      .filter(
        (row) =>
          (!where.userId || row.userId === where.userId) &&
          (!where.type || row.type === where.type),
      )
      .filter((row) => {
        if (where.version && row.version !== where.version) return false;
        if (where.purpose && row.purpose !== where.purpose) return false;
        if (where.recipient && row.recipient !== where.recipient) return false;
        if (where.revokedAt === null && row.revokedAt !== null) return false;
        const lowerBound = where.revokedAt?.gte as Date | undefined;
        if (
          lowerBound &&
          (!row.revokedAt || row.revokedAt.getTime() < lowerBound.getTime())
        ) {
          return false;
        }
        return true;
      })
      .sort(
        (left, right) =>
          (right.revokedAt ?? right.grantedAt).getTime() -
          (left.revokedAt ?? left.grantedAt).getTime(),
      );
    return matches[0] ?? null;
  });

  const updateMany = vi.fn(
    async ({
      where,
      data,
    }: {
      where: { userId: string; type: string; revokedAt: null };
      data: { revokedAt: Date };
    }) => {
      let count = 0;
      for (const row of state.records) {
        if (
          row.userId === where.userId &&
          row.type === where.type &&
          row.revokedAt === null
        ) {
          row.revokedAt = data.revokedAt;
          count++;
        }
      }
      return { count };
    },
  );

  const create = vi.fn(async ({ data }: { data: Omit<RecordRow, "id"> }) => {
    const row = { id: `row-${state.records.length + 1}`, ...data };
    state.records.push(row);
    return row;
  });

  const update = vi.fn(
    async ({
      where,
      data,
    }: {
      where: { id: string };
      data: Partial<Omit<RecordRow, "id" | "userId" | "type">>;
    }) => {
      const row = state.records.find((candidate) => candidate.id === where.id);
      if (!row) throw new Error("FAKE_CONSENT_NOT_FOUND");
      Object.assign(row, data);
      return row;
    },
  );
  const leaseFindMany = vi.fn(async () => []);

  const queryRaw = vi.fn(async (query: { sql?: string }) => {
    if (query.sql?.includes("pg_advisory_xact_lock")) {
      return acquire();
    }
    if (query.sql?.includes("clock_timestamp")) {
      const pause = pauseClock;
      pauseClock = undefined;
      if (pause) {
        pause.entered();
        await pause.wait;
      }
      sequence++;
      return [{ now: new Date(1_800_000_000_000 + sequence) }];
    }
    return [];
  });

  const transaction = vi.fn(
    async (
      callback: (tx: {
        consent: {
          findFirst: typeof findFirst;
          updateMany: typeof updateMany;
          update: typeof update;
          create: typeof create;
        };
        aiCoachTransferLease: { findMany: typeof leaseFindMany };
        $queryRaw: (query: { sql?: string }) => Promise<unknown>;
      }) => Promise<unknown>,
    ) => {
      let releaseLock: (() => void) | undefined;
      const txQueryRaw = async (query: { sql?: string }) => {
        const result = await queryRaw(query);
        if (query.sql?.includes("pg_advisory_xact_lock")) {
          releaseLock = result as unknown as () => void;
          return [{ pg_advisory_xact_lock: null }];
        }
        return result;
      };
      try {
        return await callback({
          consent: { findFirst, updateMany, update, create },
          aiCoachTransferLease: { findMany: leaseFindMany },
          $queryRaw: txQueryRaw,
        });
      } finally {
        releaseLock?.();
      }
    },
  );

  return {
    state,
    findFirst,
    updateMany,
    update,
    create,
    leaseFindMany,
    queryRaw,
    transaction,
  };
});

vi.mock("@/lib/db", () => ({
  prisma: {
    consent: { findFirst: harness.findFirst },
    $transaction: harness.transaction,
  },
}));

import {
  AI_COACH_CONSENT,
  AiCoachConsentRequiredError,
  AiCoachConsentSupersededError,
  grantAiCoachConsent,
  revokeAiCoachConsent,
  withActiveAiCoachConsent,
} from "@/lib/ai-coach/consent";

function activeRecord(userId = "user-1") {
  return {
    id: "active",
    userId,
    ...AI_COACH_CONSENT,
    grantedAt: new Date(1_799_999_999_000),
    revokedAt: null,
  };
}

describe("linéarisation des opérations DB courtes sur le consentement", () => {
  beforeEach(() => {
    harness.state.reset();
  });

  it("fait attendre DELETE jusqu'à la fin d'une opération DB déjà verrouillée", async () => {
    harness.state.records.push(activeRecord());
    const operationEntered = deferred();
    const finishOperation = deferred();

    const transfer = withActiveAiCoachConsent("user-1", async () => {
      operationEntered.resolve();
      await finishOperation.promise;
      return "operation-finished";
    });
    await operationEntered.promise;

    let revokeSettled = false;
    const revoke = revokeAiCoachConsent("user-1").finally(() => {
      revokeSettled = true;
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(revokeSettled).toBe(false);

    finishOperation.resolve();
    await expect(transfer).resolves.toBe("operation-finished");
    await revoke;

    const forbiddenCallback = vi.fn();
    await expect(
      withActiveAiCoachConsent("user-1", forbiddenCallback),
    ).rejects.toBeInstanceOf(AiCoachConsentRequiredError);
    expect(forbiddenCallback).not.toHaveBeenCalled();
  });

  it("empêche un grant chevauchant un retrait de réactiver après celui-ci", async () => {
    const revokeClockEntered = deferred();
    const finishRevoke = deferred();
    harness.state.pauseNextClock(
      () => revokeClockEntered.resolve(),
      finishRevoke.promise,
    );

    const revoke = revokeAiCoachConsent("user-1");
    await revokeClockEntered.promise;

    const racingGrant = grantAiCoachConsent("user-1");
    await Promise.resolve();
    finishRevoke.resolve();

    await revoke;
    await expect(racingGrant).rejects.toBeInstanceOf(
      AiCoachConsentSupersededError,
    );
    expect(
      harness.state.records.filter((record) => record.revokedAt === null),
    ).toHaveLength(0);
  });

  it("borne les DELETE répétés à une unique barrière de révocation", async () => {
    await revokeAiCoachConsent("user-1");
    await revokeAiCoachConsent("user-1");
    await revokeAiCoachConsent("user-1");

    expect(
      harness.state.records.filter(
        (record) => record.purpose === "AI_COACH_REVOCATION_BARRIER",
      ),
    ).toHaveLength(1);
  });
});
