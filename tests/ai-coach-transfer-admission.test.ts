import { beforeEach, describe, expect, it, vi } from "vitest";

type ConsentRow = {
  id: string;
  type: string;
  version: string | null;
  purpose: string | null;
  recipient: string | null;
  grantedAt: Date;
  revokedAt: Date | null;
};

type LeaseRow = {
  id: string;
  userId: string;
  consentId: string;
  admittedAt: Date;
  expiresAt: Date;
};

const deadline = vi.hoisted(() => ({
  assertActive: vi.fn(),
  Error: class DeadlineError extends Error {},
}));

const harness = vi.hoisted(() => {
  const state = {
    consent: null as ConsentRow | null,
    leases: [] as LeaseRow[],
    usage: 0,
    transactionOpen: false,
    clock: new Date("2026-07-23T12:00:00.000Z"),
  };

  const queryRaw = vi.fn(async () => [{ now: state.clock }]);
  const consentFindFirst = vi.fn(
    async ({ where }: { where: { purpose?: string } }) => {
      if (where.purpose === "AI_COACH_REVOCATION_BARRIER") return null;
      return state.consent;
    },
  );
  const consentUpdateMany = vi.fn(async () => {
    if (state.consent) state.consent.revokedAt = state.clock;
    return { count: state.consent ? 1 : 0 };
  });
  const consentCreate = vi.fn(async () => ({ id: "barrier-1" }));
  const consentUpdate = vi.fn(async () => ({ id: "barrier-1" }));

  const leaseFindMany = vi.fn(
    async ({ where }: { where?: { id?: { in: string[] } } } = {}) => {
      const ids = where?.id?.in;
      return state.leases
        .filter((lease) => !ids || ids.includes(lease.id))
        .map((lease) => ({
          id: lease.id,
          expiresAt: lease.expiresAt,
        }));
    },
  );
  const leaseCreate = vi.fn(async ({ data }: { data: LeaseRow }) => {
    state.leases.push(data);
    return { id: data.id };
  });
  const leaseDeleteMany = vi.fn(
    async ({
      where,
    }: {
      where: {
        id?: string | { in: string[] };
        userId?: string;
        expiresAt?: { lte: Date };
      };
    }) => {
      const before = state.leases.length;
      state.leases = state.leases.filter((lease) => {
        if (typeof where.id === "string") return lease.id !== where.id;
        if (where.id && "in" in where.id) {
          return !where.id.in.includes(lease.id);
        }
        if (
          where.userId &&
          where.expiresAt?.lte &&
          lease.userId === where.userId &&
          lease.expiresAt <= where.expiresAt.lte
        ) {
          return false;
        }
        return true;
      });
      return { count: before - state.leases.length };
    },
  );
  const usageUpsert = vi.fn(async () => {
    state.usage += 1;
    return { count: state.usage };
  });

  const tx = {
    $queryRaw: queryRaw,
    consent: {
      findFirst: consentFindFirst,
      updateMany: consentUpdateMany,
      create: consentCreate,
      update: consentUpdate,
    },
    aiCoachUsage: { upsert: usageUpsert },
    aiCoachTransferLease: {
      findMany: leaseFindMany,
      create: leaseCreate,
      deleteMany: leaseDeleteMany,
    },
  };

  const transaction = vi.fn(async (operation: unknown) => {
    if (Array.isArray(operation)) return Promise.all(operation);
    const callback = operation as (client: typeof tx) => Promise<unknown>;
    const snapshot = {
      usage: state.usage,
      leases: [...state.leases],
      revokedAt: state.consent?.revokedAt ?? null,
    };
    state.transactionOpen = true;
    try {
      return await callback(tx);
    } catch (error) {
      state.usage = snapshot.usage;
      state.leases = snapshot.leases;
      if (state.consent) state.consent.revokedAt = snapshot.revokedAt;
      throw error;
    } finally {
      state.transactionOpen = false;
    }
  });

  return {
    state,
    queryRaw,
    consentFindFirst,
    consentUpdateMany,
    consentCreate,
    consentUpdate,
    leaseFindMany,
    leaseCreate,
    leaseDeleteMany,
    usageUpsert,
    transaction,
  };
});

vi.mock("@/lib/db", () => ({
  prisma: {
    $queryRaw: harness.queryRaw,
    $transaction: harness.transaction,
    aiCoachTransferLease: {
      findMany: harness.leaseFindMany,
      deleteMany: harness.leaseDeleteMany,
    },
  },
}));

vi.mock("@/lib/ai-coach", () => ({
  DAILY_FREE_LIMIT: 5,
}));

vi.mock("@/lib/llm/deadline", () => ({
  assertLlmDeadlineActive: deadline.assertActive,
  LlmDeadlineExceededError: deadline.Error,
}));

vi.mock("@/lib/security/safe-error", () => ({
  safeErrorDetails: () => ({ name: "Error" }),
}));

import {
  AI_COACH_CONSENT,
  AiCoachQuotaExceededError,
  revokeAiCoachConsent,
  withAdmittedAiCoachTransfer,
} from "@/lib/ai-coach/consent";

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe("admission courte d'un transfert Coach IA", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deadline.assertActive.mockImplementation(() => {});
    harness.state.clock = new Date("2026-07-23T12:00:00.000Z");
    harness.state.usage = 0;
    harness.state.leases = [];
    harness.state.transactionOpen = false;
    harness.state.consent = {
      id: "consent-1",
      ...AI_COACH_CONSENT,
      grantedAt: new Date("2026-07-23T11:00:00.000Z"),
      revokedAt: null,
    };
  });

  it("libère la transaction avant le réseau et fait attendre le retrait", async () => {
    const providerStarted = deferred();
    const finishProvider = deferred();

    const transfer = withAdmittedAiCoachTransfer(
      "user-1",
      false,
      async ({ remaining }) => {
        expect(harness.state.transactionOpen).toBe(false);
        expect(harness.state.usage).toBe(1);
        expect(harness.state.leases).toHaveLength(1);
        expect(remaining).toBe(4);
        providerStarted.resolve();
        await finishProvider.promise;
        return "provider-finished";
      },
    );
    await providerStarted.promise;

    let revokeFinished = false;
    const revoke = revokeAiCoachConsent("user-1").finally(() => {
      revokeFinished = true;
    });
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(revokeFinished).toBe(false);
    expect(harness.state.transactionOpen).toBe(false);

    finishProvider.resolve();
    await expect(transfer).resolves.toBe("provider-finished");
    await revoke;

    expect(harness.state.leases).toHaveLength(0);
    expect(harness.state.usage).toBe(1);
    expect(harness.state.consent?.revokedAt).toEqual(harness.state.clock);
  });

  it("ne rembourse jamais le quota après un départ fournisseur en erreur", async () => {
    await expect(
      withAdmittedAiCoachTransfer("user-1", false, async () => {
        expect(harness.state.transactionOpen).toBe(false);
        throw new deadline.Error();
      }),
    ).rejects.toBeInstanceOf(deadline.Error);

    expect(harness.state.usage).toBe(1);
    expect(harness.state.leases).toHaveLength(0);
  });

  it("rollbacke le sixième jeton sans créer de bail ni appeler le fournisseur", async () => {
    harness.state.usage = 5;
    const provider = vi.fn();

    await expect(
      withAdmittedAiCoachTransfer("user-1", false, provider),
    ).rejects.toBeInstanceOf(AiCoachQuotaExceededError);

    expect(harness.state.usage).toBe(5);
    expect(harness.state.leases).toHaveLength(0);
    expect(provider).not.toHaveBeenCalled();
  });
});
