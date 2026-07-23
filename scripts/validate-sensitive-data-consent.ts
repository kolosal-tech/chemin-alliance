import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import { requireActiveMatchMember } from "@/lib/alliance";
import {
  consentingCoupleSpaceMemberWhere,
  getSensitiveDataConsentState,
  grantSensitiveDataConsent,
  revokeSensitiveDataConsent,
} from "@/lib/sensitive-data-consent";

function assertDisposableDatabase(): void {
  const url = new URL(process.env.DATABASE_URL ?? "");
  const loopback = ["127.0.0.1", "localhost", "::1"].includes(url.hostname);
  const isolatedName = url.pathname.slice(1).startsWith("codex-");
  assert(loopback && isolatedName, "DISPOSABLE_LOCAL_DATABASE_REQUIRED");
  assert(process.env.NODE_ENV !== "production", "PRODUCTION_FORBIDDEN");
}

async function main() {
  assertDisposableDatabase();
  const nonce = randomUUID();
  let firstId: string | undefined;
  let secondId: string | undefined;

  try {
    const [first, second] = await Promise.all(
      ["a", "b"].map((suffix) =>
        prisma.user.create({
          data: {
            email: `sensitive-consent-${suffix}-${nonce}@example.test`,
            passwordHash: "integration-only",
            displayName: `Consent ${suffix.toUpperCase()}`,
            age: 30,
            gender: suffix === "a" ? "F" : "M",
            isVerified: true,
            privacySettings: { create: {} },
            consents: {
              createMany: {
                data: [
                  { type: "SENSITIVE_DATA_PROCESSING" },
                  { type: "AGENT_PROFILING" },
                  {
                    type: "AI_COACH_INTERACTION",
                    version: "integration",
                    purpose: "integration",
                    recipient: "integration",
                  },
                ],
              },
            },
          },
        }),
      ),
    );
    firstId = first.id;
    secondId = second.id;

    const match = await prisma.match.create({
      data: {
        userAId: first.id,
        userBId: second.id,
        requestedById: first.id,
        status: "ACTIVE",
      },
    });
    const pairKey = [first.id, second.id].sort().join(":");
    const space = await prisma.coupleSpace.create({
      data: {
        userAId: first.id,
        userBId: second.id,
        pairKey,
        matchId: match.id,
        origin: "MATCH",
        status: "ACTIVE",
      },
    });

    await assert.doesNotReject(requireActiveMatchMember(match.id, first.id));
    assert(
      await prisma.coupleSpace.findFirst({
        where: {
          id: space.id,
          ...consentingCoupleSpaceMemberWhere(first.id),
        },
      }),
    );

    await revokeSensitiveDataConsent(second.id);
    assert.equal((await getSensitiveDataConsentState(second.id)).active, false);
    assert.equal(
      (
        await prisma.privacySettings.findUniqueOrThrow({
          where: { userId: second.id },
        })
      ).invisibleMode,
      true,
    );
    assert.equal(
      await prisma.consent.count({
        where: {
          userId: second.id,
          type: { in: ["AGENT_PROFILING", "AI_COACH_INTERACTION"] },
          revokedAt: null,
        },
      }),
      0,
    );
    await assert.rejects(
      requireActiveMatchMember(match.id, first.id),
      (error: unknown) =>
        typeof error === "object" &&
        error !== null &&
        "status" in error &&
        error.status === 404,
    );
    assert.equal(
      await prisma.coupleSpace.findFirst({
        where: {
          id: space.id,
          ...consentingCoupleSpaceMemberWhere(first.id),
        },
      }),
      null,
    );

    await Promise.all(
      Array.from({ length: 8 }, () => grantSensitiveDataConsent(second.id)),
    );
    assert.equal(
      await prisma.consent.count({
        where: {
          userId: second.id,
          type: "SENSITIVE_DATA_PROCESSING",
          revokedAt: null,
        },
      }),
      1,
    );
    assert.equal(
      (
        await prisma.privacySettings.findUniqueOrThrow({
          where: { userId: second.id },
        })
      ).invisibleMode,
      false,
    );
    await assert.doesNotReject(requireActiveMatchMember(match.id, first.id));

    await revokeSensitiveDataConsent(second.id);
    await revokeSensitiveDataConsent(second.id);
    assert.equal(
      await prisma.consent.count({
        where: {
          userId: second.id,
          type: "SENSITIVE_DATA_PROCESSING",
          purpose: "SENSITIVE_DATA_PROCESSING_REVOCATION_BARRIER",
        },
      }),
      1,
    );

    console.log("SENSITIVE_DATA_CONSENT_INTEGRATION_OK");
  } finally {
    if (firstId && secondId) {
      await prisma.$transaction([
        prisma.coupleSpace.deleteMany({
          where: { OR: [{ userAId: firstId }, { userBId: firstId }] },
        }),
        prisma.match.deleteMany({
          where: { OR: [{ userAId: firstId }, { userBId: firstId }] },
        }),
      ]);
      await prisma.user.deleteMany({
        where: { id: { in: [firstId, secondId] } },
      });
    }
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "SENSITIVE_DATA_CONSENT_FAILED",
  );
  process.exitCode = 1;
});
