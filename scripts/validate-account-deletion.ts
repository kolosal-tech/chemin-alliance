import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import { eraseAccountData } from "@/lib/account-deletion";
import { openAllianceAnswer, sealAllianceAnswer } from "@/lib/alliance-answer";
import {
  blessingTokenExpiresAt,
  generateBlessingToken,
  hashBlessingToken,
} from "@/lib/sponsor";

async function main() {
  const nonce = randomUUID();
  const now = new Date("2026-07-23T08:00:00.000Z");
  let firstId: string | undefined;
  let secondId: string | undefined;

  try {
    const first = await prisma.user.create({
      data: {
        email: `delete-a-${nonce}@example.test`,
        passwordHash: "before-delete",
        displayName: "Personne A",
        age: 33,
        gender: "F",
        isVerified: true,
        phone: "+33123456789",
        phoneVerified: true,
        cityApprox: "Paris",
        country: "France",
        stripeCustomerId: `cus_${nonce.replaceAll("-", "")}`,
        subscriptionStatus: "active",
        faithProfile: { create: { denomination: "test" } },
        relationshipProfile: {
          create: { maritalStatus: "single", intentionStatement: "test" },
        },
        privacySettings: { create: {} },
        consents: { create: { type: "SENSITIVE_DATA_PROCESSING" } },
        coachMessages: {
          create: {
            role: "user",
            contentEncrypted: "private-coach-content",
          },
        },
        pushSubscriptions: {
          create: {
            endpoint: `https://push.example/${nonce}`,
            p256dh: "p256dh",
            auth: "auth",
          },
        },
        sponsor: {
          create: {
            name: "Sponsor",
            email: `sponsor-${nonce}@example.test`,
            relation: "friend",
          },
        },
      },
    });
    const second = await prisma.user.create({
      data: {
        email: `delete-b-${nonce}@example.test`,
        passwordHash: "partner-hash",
        displayName: "Personne B",
        age: 34,
        gender: "M",
        isVerified: true,
      },
    });
    firstId = first.id;
    secondId = second.id;

    const match = await prisma.match.create({
      data: {
        userAId: first.id,
        userBId: second.id,
        status: "ACTIVE",
        requestedById: first.id,
        messages: {
          create: [
            {
              senderId: first.id,
              contentEncrypted: "message-a",
              kind: "USER",
            },
            {
              senderId: second.id,
              contentEncrypted: "message-b",
              kind: "USER",
            },
            {
              senderId: first.id,
              contentEncrypted: "system-derived",
              kind: "SYSTEM",
            },
          ],
        },
        allianceAnswers: {
          create: [
            {
              userId: first.id,
              stage: "DISCOVERY",
              questionId: "a",
              ...sealAllianceAnswer("private-answer-a"),
            },
            {
              userId: second.id,
              stage: "DISCOVERY",
              questionId: "b",
              ...sealAllianceAnswer("partner-answer-b"),
            },
          ],
        },
        agentInsights: {
          create: {
            userId: first.id,
            agentId: "test-agent",
            kind: "private",
            dataJson: { secret: true },
          },
        },
      },
    });
    await prisma.report.create({
      data: {
        reporterId: first.id,
        targetUserId: second.id,
        reason: "retained-safety-record",
      },
    });
    await prisma.block.create({
      data: { blockerId: first.id, blockedId: second.id },
    });
    await prisma.pass.create({
      data: { passerId: second.id, passedId: first.id },
    });
    const sponsor = await prisma.sponsor.findUniqueOrThrow({
      where: { userId: first.id },
    });
    const blessingCreatedAt = new Date();
    const blessingToken = generateBlessingToken();
    await prisma.blessing.create({
      data: {
        sponsorId: sponsor.id,
        matchId: match.id,
        userId: first.id,
        tokenHash: hashBlessingToken(blessingToken),
        expiresAt: blessingTokenExpiresAt(blessingCreatedAt),
        emailSentAt: blessingCreatedAt,
        createdAt: blessingCreatedAt,
      },
    });

    const space = await prisma.coupleSpace.create({
      data: {
        userAId: first.id,
        userBId: second.id,
        pairKey: [first.id, second.id].sort().join(":"),
        status: "ACTIVE",
        inviteCode: null,
        messages: {
          create: [
            { senderId: first.id, contentEncrypted: "couple-a" },
            { senderId: second.id, contentEncrypted: "couple-b" },
          ],
        },
      },
    });
    await prisma.gameRound.create({
      data: {
        coupleSpaceId: space.id,
        mode: "SHARED",
        questionKey: "test",
        initiatorId: first.id,
        answers: {
          create: [
            { userId: first.id, answerEncrypted: "answer-a" },
            { userId: second.id, answerEncrypted: "answer-b" },
          ],
        },
      },
    });

    await eraseAccountData(first.id, "after-delete-random-hash", now);

    const deleted = await prisma.user.findUniqueOrThrow({
      where: { id: first.id },
      include: {
        faithProfile: true,
        relationshipProfile: true,
        privacySettings: true,
        consents: true,
        coachMessages: true,
        pushSubscriptions: true,
        sponsor: true,
      },
    });
    assert.equal(deleted.deletedAt?.toISOString(), now.toISOString());
    assert.equal(deleted.displayName, "Membre retiré");
    assert.equal(deleted.phone, null);
    assert.equal(deleted.stripeCustomerId, null);
    assert.equal(deleted.photoBlurhash, null);
    assert.equal(deleted.faithProfile, null);
    assert.equal(deleted.relationshipProfile, null);
    assert.equal(deleted.privacySettings, null);
    assert.equal(deleted.consents.length, 0);
    assert.equal(deleted.coachMessages.length, 0);
    assert.equal(deleted.pushSubscriptions.length, 0);
    assert.equal(deleted.sponsor, null);

    const closedMatch = await prisma.match.findUniqueOrThrow({
      where: { id: match.id },
      include: { messages: true, allianceAnswers: true, agentInsights: true },
    });
    assert.equal(closedMatch.status, "CLOSED");
    assert.equal(closedMatch.stage, "CLOSED");
    assert.deepEqual(
      closedMatch.messages.map((message) => message.contentEncrypted),
      ["message-b"],
    );
    assert.deepEqual(closedMatch.allianceAnswers.map(openAllianceAnswer), [
      "partner-answer-b",
    ]);
    assert.equal(closedMatch.agentInsights.length, 0);

    const promotedSpace = await prisma.coupleSpace.findUniqueOrThrow({
      where: { id: space.id },
      include: { messages: true, gameRounds: true },
    });
    assert.equal(promotedSpace.userAId, second.id);
    assert.equal(promotedSpace.userBId, null);
    assert.equal(promotedSpace.status, "PENDING");
    assert.deepEqual(
      promotedSpace.messages.map((message) => message.contentEncrypted),
      ["couple-b"],
    );
    assert.equal(promotedSpace.gameRounds.length, 0);

    assert.equal(
      await prisma.report.count({ where: { reporterId: first.id } }),
      1,
    );
    assert.equal(
      await prisma.block.count({
        where: { OR: [{ blockerId: first.id }, { blockedId: first.id }] },
      }),
      0,
    );
    assert.equal(
      await prisma.pass.count({
        where: { OR: [{ passerId: first.id }, { passedId: first.id }] },
      }),
      0,
    );

    console.log("ACCOUNT_DELETION_INTEGRATION_OK");
  } finally {
    const fixtureUserIds = [firstId, secondId].filter(
      (id): id is string => id !== undefined,
    );
    if (fixtureUserIds.length > 0) {
      // 0023 protège désormais les membres CoupleSpace par FK RESTRICT. La
      // validation doit donc supprimer explicitement ses fixtures relationnelles
      // après avoir vérifié leur préservation, avant le nettoyage des Users.
      await prisma.coupleSpace.deleteMany({
        where: {
          OR: [
            { userAId: { in: fixtureUserIds } },
            { userBId: { in: fixtureUserIds } },
          ],
        },
      });
      await prisma.match.deleteMany({
        where: {
          OR: [
            { userAId: { in: fixtureUserIds } },
            { userBId: { in: fixtureUserIds } },
          ],
        },
      });
      await prisma.user.deleteMany({ where: { id: { in: fixtureUserIds } } });
    }
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
