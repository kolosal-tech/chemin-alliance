import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  updateMany: vi.fn(),
  update: vi.fn(),
  create: vi.fn(),
  leaseFindMany: vi.fn(),
  queryRaw: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/db", () => {
  const consent = {
    findFirst: mocks.findFirst,
    updateMany: mocks.updateMany,
    update: mocks.update,
    create: mocks.create,
  };
  return {
    prisma: {
      consent,
      aiCoachTransferLease: { findMany: mocks.leaseFindMany },
      $transaction: mocks.transaction,
    },
  };
});

import {
  AI_COACH_CONSENT,
  AiCoachConsentSupersededError,
  activeAiCoachConsentWhere,
  aiCoachConsentDto,
  getActiveAiCoachConsent,
  grantAiCoachConsent,
  isExactActiveAiCoachConsent,
  revokeAiCoachConsent,
  withActiveAiCoachConsent,
} from "@/lib/ai-coach/consent";

const GRANTED_AT = new Date("2026-07-23T10:00:00.000Z");
const exactConsent = {
  id: "consent-current",
  ...AI_COACH_CONSENT,
  grantedAt: GRANTED_AT,
  revokedAt: null,
};

function sqlText(query: unknown): string {
  return (
    (query as { sql?: string }).sql ??
    (query as { text?: string }).text ??
    String(query)
  );
}

describe("consentement dédié au Coach IA", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.leaseFindMany.mockResolvedValue([]);
    mocks.queryRaw.mockImplementation(async (query: unknown) => {
      if (sqlText(query).includes("clock_timestamp")) {
        return [{ now: new Date("2026-07-23T10:01:00.000Z") }];
      }
      return [{ pg_advisory_xact_lock: null }];
    });
    mocks.transaction.mockImplementation(
      async (
        callback: (tx: {
          consent: {
            findFirst: typeof mocks.findFirst;
            updateMany: typeof mocks.updateMany;
            update: typeof mocks.update;
            create: typeof mocks.create;
          };
          aiCoachTransferLease: {
            findMany: typeof mocks.leaseFindMany;
          };
          $queryRaw: typeof mocks.queryRaw;
        }) => Promise<unknown>,
      ) =>
        callback({
          consent: {
            findFirst: mocks.findFirst,
            updateMany: mocks.updateMany,
            update: mocks.update,
            create: mocks.create,
          },
          aiCoachTransferLease: {
            findMany: mocks.leaseFindMany,
          },
          $queryRaw: mocks.queryRaw,
        }),
    );
  });

  it("n'accepte que le type, la version, la finalité et le fingerprint exacts", () => {
    expect(isExactActiveAiCoachConsent(exactConsent)).toBe(true);

    for (const candidate of [
      { ...exactConsent, type: "AGENT_PROFILING" },
      { ...exactConsent, version: "ai-coach-old-v0" },
      { ...exactConsent, purpose: null },
      { ...exactConsent, recipient: "sha256:obsolete" },
      { ...exactConsent, revokedAt: new Date() },
    ]) {
      expect(isExactActiveAiCoachConsent(candidate)).toBe(false);
    }
  });

  it("interroge la base avec le périmètre canonique et échoue fermé", async () => {
    mocks.findFirst.mockResolvedValue({
      ...exactConsent,
      version: "ai-coach-old-v0",
    });

    await expect(getActiveAiCoachConsent("user-1")).resolves.toBeNull();
    expect(mocks.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: activeAiCoachConsentWhere("user-1"),
      }),
    );
  });

  it("verrouille puis recueille le périmètre serveur courant", async () => {
    mocks.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    mocks.updateMany.mockResolvedValue({ count: 1 });
    mocks.create.mockImplementation(async ({ data }) => ({
      id: "consent-new",
      ...data,
      revokedAt: null,
    }));

    const consent = await grantAiCoachConsent("user-1");

    expect(
      mocks.queryRaw.mock.calls.some(([query]) =>
        sqlText(query).includes("pg_advisory_xact_lock"),
      ),
    ).toBe(true);
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        type: AI_COACH_CONSENT.type,
        revokedAt: null,
      },
      data: { revokedAt: expect.any(Date) },
    });
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-1",
          ...AI_COACH_CONSENT,
          grantedAt: expect.any(Date),
        }),
      }),
    );
    expect(consent).toMatchObject({
      id: "consent-new",
      ...AI_COACH_CONSENT,
      revokedAt: null,
    });
    expect(mocks.transaction).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        isolationLevel: "ReadCommitted",
        timeout: 25_000,
      }),
    );
  });

  it("refuse un grant admis avant un retrait concurrent plus récent", async () => {
    const admission = new Date("2026-07-23T10:01:00.000Z");
    mocks.queryRaw.mockImplementation(async (query: unknown) =>
      sqlText(query).includes("clock_timestamp")
        ? [{ now: admission }]
        : [{ pg_advisory_xact_lock: null }],
    );
    mocks.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({
      revokedAt: new Date("2026-07-23T10:01:00.001Z"),
    });

    await expect(grantAiCoachConsent("user-1")).rejects.toBeInstanceOf(
      AiCoachConsentSupersededError,
    );
    expect(mocks.updateMany).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("retire sous verrou et écrit un tombstone même sans ligne active", async () => {
    mocks.findFirst.mockResolvedValue(null);
    mocks.updateMany.mockResolvedValue({ count: 0 });
    mocks.create.mockResolvedValue({ id: "revocation-tombstone" });

    const revokedAt = await revokeAiCoachConsent("user-1");

    expect(revokedAt).toEqual(new Date("2026-07-23T10:01:00.000Z"));
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        type: AI_COACH_CONSENT.type,
        revokedAt: null,
      },
      data: { revokedAt },
    });
    expect(mocks.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        type: AI_COACH_CONSENT.type,
        version: AI_COACH_CONSENT.version,
        purpose: "AI_COACH_REVOCATION_BARRIER",
        recipient: AI_COACH_CONSENT.recipient,
        grantedAt: revokedAt,
        revokedAt,
      },
      select: { id: true },
    });
  });

  it("rafraîchit la barrière existante sans ajouter de ligne", async () => {
    mocks.findFirst.mockResolvedValue({ id: "barrier-1" });
    mocks.updateMany.mockResolvedValue({ count: 0 });
    mocks.update.mockResolvedValue({ id: "barrier-1" });

    const revokedAt = await revokeAiCoachConsent("user-1");

    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "barrier-1" },
      data: {
        version: AI_COACH_CONSENT.version,
        recipient: AI_COACH_CONSENT.recipient,
        revokedAt,
      },
      select: { id: true },
    });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("ne lance le callback qu'après verrou et relecture exacte", async () => {
    mocks.findFirst.mockResolvedValue(exactConsent);
    const callback = vi.fn().mockResolvedValue("ok");

    await expect(withActiveAiCoachConsent("user-1", callback)).resolves.toBe(
      "ok",
    );
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({ consent: expect.any(Object) }),
      exactConsent,
    );
    expect(mocks.queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.findFirst.mock.invocationCallOrder[0],
    );
  });

  it("expose seulement un résumé humain sûr et un fingerprint opaque", () => {
    const dto = aiCoachConsentDto(exactConsent);

    expect(dto.recipient).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(dto.recipientSummary.length).toBeGreaterThan(0);
    expect(dto.recipientSummary).not.toContain("sk-");
  });
});
