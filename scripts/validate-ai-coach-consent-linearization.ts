import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  AI_COACH_CONSENT,
  AiCoachConsentRequiredError,
  AiCoachQuotaExceededError,
  AiCoachConsentSupersededError,
  acquireAiCoachConsentLock,
  grantAiCoachConsent,
  revokeAiCoachConsent,
  withAdmittedAiCoachTransfer,
} from "@/lib/ai-coach/consent";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL_REQUIRED");

const parsedUrl = new URL(databaseUrl);
const databaseName = parsedUrl.pathname.replace(/^\//, "");
const schema = parsedUrl.searchParams.get("schema");
const isLoopback = ["localhost", "127.0.0.1", "[::1]"].includes(
  parsedUrl.hostname,
);
const isIsolated =
  databaseName.startsWith("codex-") || schema?.startsWith("codex_ai_consent_");
if (process.env.NODE_ENV === "production" || !isLoopback || !isIsolated) {
  throw new Error(
    "REFUSING_NON_ISOLATED_DATABASE: use a local codex-* database or codex_ai_consent_* schema",
  );
}

type Deferred = {
  promise: Promise<void>;
  resolve: () => void;
};

function deferred(): Deferred {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

async function waitForAdvisoryWaiter(): Promise<void> {
  for (let attempt = 0; attempt < 50; attempt++) {
    const [row] = await prisma.$queryRaw<Array<{ waiting: number }>>(
      Prisma.sql`
        SELECT count(*)::int AS "waiting"
        FROM pg_locks
        WHERE locktype = 'advisory' AND granted = false
      `,
    );
    if ((row?.waiting ?? 0) > 0) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error("ADVISORY_LOCK_WAITER_NOT_OBSERVED");
}

async function waitForRevocationCommit(userId: string): Promise<void> {
  for (let attempt = 0; attempt < 50; attempt++) {
    const revoked = await prisma.consent.findFirst({
      where: {
        userId,
        type: AI_COACH_CONSENT.type,
        revokedAt: { not: null },
      },
      select: { id: true },
    });
    if (revoked) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error("AI_COACH_REVOCATION_COMMIT_NOT_OBSERVED");
}

async function main() {
  const nonce = randomUUID();
  let userId: string | undefined;

  try {
    const user = await prisma.user.create({
      data: {
        email: `ai-consent-${nonce}@example.test`,
        passwordHash: "integration-test-only",
        displayName: "AI consent fixture",
        age: 30,
        isVerified: true,
      },
      select: { id: true },
    });
    userId = user.id;
    await grantAiCoachConsent(user.id);

    // Course 1 : transfert déjà parti -> DELETE doit attendre sa terminaison.
    const providerEntered = deferred();
    const stopProvider = deferred();
    const transfer = withAdmittedAiCoachTransfer(
      user.id,
      true,
      async ({ leaseId }) => {
        // Le bail est visible depuis une autre requête : l'admission a donc
        // bien été commitée et aucune transaction longue ne porte le réseau.
        assert.equal(
          await prisma.aiCoachTransferLease.count({
            where: { id: leaseId },
          }),
          1,
        );
        providerEntered.resolve();
        await stopProvider.promise;
        return "provider-stopped";
      },
    );
    await providerEntered.promise;
    let revokeFinished = false;
    const revoke = revokeAiCoachConsent(user.id).finally(() => {
      revokeFinished = true;
    });
    await waitForRevocationCommit(user.id);
    assert.equal(revokeFinished, false);
    stopProvider.resolve();
    assert.equal(await transfer, "provider-stopped");
    await revoke;
    assert.equal(revokeFinished, true);
    await assert.rejects(
      withAdmittedAiCoachTransfer(user.id, true, async () => "forbidden"),
      AiCoachConsentRequiredError,
    );
    console.info("AI_CONSENT_DB_PROVIDER_THEN_REVOKE_OK");

    // Course 2 : retrait sous verrou -> un nouveau départ attend puis échoue.
    await new Promise((resolve) => setTimeout(resolve, 2));
    await grantAiCoachConsent(user.id);
    const revokeHasLock = deferred();
    const commitRevoke = deferred();
    const lockedRevoke = prisma.$transaction(async (tx) => {
      await acquireAiCoachConsentLock(tx, user.id);
      revokeHasLock.resolve();
      await commitRevoke.promise;
      const [clock] = await tx.$queryRaw<Array<{ now: Date }>>(
        Prisma.sql`SELECT clock_timestamp() AS "now"`,
      );
      assert.ok(clock?.now);
      await tx.consent.updateMany({
        where: {
          userId: user.id,
          type: AI_COACH_CONSENT.type,
          revokedAt: null,
        },
        data: { revokedAt: clock.now },
      });
      await tx.consent.create({
        data: {
          userId: user.id,
          ...AI_COACH_CONSENT,
          grantedAt: clock.now,
          revokedAt: clock.now,
        },
      });
    });
    await revokeHasLock.promise;
    let forbiddenProviderStarted = false;
    const blockedTransfer = withAdmittedAiCoachTransfer(
      user.id,
      true,
      async () => {
        forbiddenProviderStarted = true;
      },
    );
    await waitForAdvisoryWaiter();
    commitRevoke.resolve();
    await lockedRevoke;
    await assert.rejects(blockedTransfer, AiCoachConsentRequiredError);
    assert.equal(forbiddenProviderStarted, false);
    console.info("AI_CONSENT_DB_REVOKE_THEN_PROVIDER_OK");

    // Course 3 : un grant admis pendant un retrait ne peut pas le dépasser.
    const tombstoneHasLock = deferred();
    const writeTombstone = deferred();
    const revocationBarrier = prisma.$transaction(async (tx) => {
      await acquireAiCoachConsentLock(tx, user.id);
      tombstoneHasLock.resolve();
      await writeTombstone.promise;
      const [clock] = await tx.$queryRaw<Array<{ now: Date }>>(
        Prisma.sql`SELECT clock_timestamp() AS "now"`,
      );
      assert.ok(clock?.now);
      await tx.consent.create({
        data: {
          userId: user.id,
          ...AI_COACH_CONSENT,
          grantedAt: clock.now,
          revokedAt: clock.now,
        },
      });
    });
    await tombstoneHasLock.promise;
    const racingGrant = grantAiCoachConsent(user.id);
    await waitForAdvisoryWaiter();
    writeTombstone.resolve();
    await revocationBarrier;
    await assert.rejects(racingGrant, AiCoachConsentSupersededError);
    assert.equal(
      await prisma.consent.count({
        where: {
          userId: user.id,
          type: AI_COACH_CONSENT.type,
          revokedAt: null,
        },
      }),
      0,
    );
    console.info("AI_CONSENT_DB_REVOKE_BEATS_RACING_GRANT_OK");

    // Le quota dépassé rollbacke la courte admission : aucune réservation ni
    // aucun fournisseur, et la valeur persistée reste bornée à 5.
    await new Promise((resolve) => setTimeout(resolve, 2));
    await grantAiCoachConsent(user.id);
    const day = new Date();
    day.setUTCHours(0, 0, 0, 0);
    await prisma.aiCoachUsage.create({
      data: { userId: user.id, day, count: 5 },
    });
    let overQuotaProviderStarted = false;
    await assert.rejects(
      withAdmittedAiCoachTransfer(user.id, false, async () => {
        overQuotaProviderStarted = true;
      }),
      AiCoachQuotaExceededError,
    );
    const persistedUsage = await prisma.aiCoachUsage.findUniqueOrThrow({
      where: { userId_day: { userId: user.id, day } },
    });
    assert.equal(persistedUsage.count, 5);
    assert.equal(overQuotaProviderStarted, false);
    console.info("AI_CONSENT_DB_QUOTA_ROLLBACK_OK");

    // Une erreur après admission ne rembourse jamais un transfert qui a pu
    // atteindre le fournisseur.
    await prisma.aiCoachUsage.deleteMany({ where: { userId: user.id } });
    await assert.rejects(
      withAdmittedAiCoachTransfer(user.id, false, async () => {
        throw new Error("SIMULATED_PROVIDER_TIMEOUT_AFTER_ADMISSION");
      }),
      /SIMULATED_PROVIDER_TIMEOUT_AFTER_ADMISSION/,
    );
    const consumedAfterTimeout = await prisma.aiCoachUsage.findUniqueOrThrow({
      where: { userId_day: { userId: user.id, day } },
    });
    assert.equal(consumedAfterTimeout.count, 1);
    assert.equal(
      await prisma.aiCoachTransferLease.count({ where: { userId: user.id } }),
      0,
    );
    console.info("AI_CONSENT_DB_TIMEOUT_QUOTA_DURABLE_OK");
  } finally {
    if (userId) {
      await prisma.user.deleteMany({ where: { id: userId } });
    }
  }
}

main()
  .then(() => {
    console.info("AI_COACH_CONSENT_LINEARIZATION_INTEGRATION_OK");
  })
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
