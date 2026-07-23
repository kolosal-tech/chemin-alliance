import assert from "node:assert/strict";
import { prisma } from "../lib/db";
import {
  confirmMatchCoupleSpace,
  createExternalCoupleSpace,
  createMatchCoupleSpace,
  issueCoupleInvite,
  joinCoupleSpaceByInvite,
  requestCoupleSeasonChange,
} from "../lib/couple-space";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL_REQUIRED");

const parsedUrl = new URL(databaseUrl);
const schema = parsedUrl.searchParams.get("schema");
if (
  !["localhost", "127.0.0.1", "[::1]"].includes(parsedUrl.hostname) ||
  !schema?.startsWith("codex_couple_integrity_")
) {
  throw new Error(
    "REFUSING_NON_ISOLATED_DATABASE: use a local codex_couple_integrity_* schema",
  );
}

const nonce = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
async function createUser(
  label: string,
  season: "JOURNEY" | "MARRIED" = "JOURNEY",
) {
  const user = await prisma.user.create({
    data: {
      email: `${label}-${nonce}@example.test`,
      passwordHash: "integration-test-only",
      displayName: label,
      age: 30,
      isVerified: true,
      season,
      relationshipProfile: {
        create: { maritalStatus: season === "MARRIED" ? "married" : "single" },
      },
    },
    select: { id: true, email: true },
  });
  return user;
}

async function main() {
  const matchA = await createUser("match-a");
  const matchB = await createUser("match-b");
  const match = await prisma.match.create({
    data: {
      userAId: matchA.id,
      userBId: matchB.id,
      status: "ACTIVE",
      stage: "COMMITMENT",
    },
  });

  const concurrentCreates = await Promise.all([
    createMatchCoupleSpace(matchA.id, match.id),
    createMatchCoupleSpace(matchB.id, match.id),
  ]);
  assert.equal(concurrentCreates[0].spaceId, concurrentCreates[1].spaceId);
  assert.equal(
    await prisma.coupleSpace.count({ where: { matchId: match.id } }),
    1,
  );
  console.info("couple-space integrity: concurrent match creation OK");

  const matchSpace = await prisma.coupleSpace.findUniqueOrThrow({
    where: { matchId: match.id },
  });
  assert.ok(matchSpace.pairKey);
  assert.ok(matchSpace.userBId);
  await confirmMatchCoupleSpace(matchSpace.userBId);
  const idempotentActive = await createMatchCoupleSpace(
    matchSpace.userAId,
    match.id,
  );
  assert.equal(idempotentActive.spaceId, matchSpace.id);
  assert.equal(idempotentActive.pendingPartner, false);

  const requested = await requestCoupleSeasonChange(
    matchSpace.userAId,
    "PARENTS",
  );
  assert.equal(requested.state, "REQUESTED");
  const beforeConfirmation = await prisma.coupleSpace.findUniqueOrThrow({
    where: { id: matchSpace.id },
  });
  assert.equal(beforeConfirmation.season, "MARRIED");
  assert.equal(beforeConfirmation.seasonRequestedBy, matchSpace.userAId);

  const confirmed = await requestCoupleSeasonChange(
    matchSpace.userBId,
    "PARENTS",
  );
  assert.equal(confirmed.state, "ADVANCED");
  const afterConfirmation = await prisma.coupleSpace.findUniqueOrThrow({
    where: { id: matchSpace.id },
  });
  assert.equal(afterConfirmation.season, "PARENTS");
  assert.equal(afterConfirmation.seasonRequestedBy, null);
  const transitionedUsers = await prisma.user.findMany({
    where: { id: { in: [matchSpace.userAId, matchSpace.userBId] } },
    select: { season: true },
  });
  assert.deepEqual(transitionedUsers.map(({ season }) => season).sort(), [
    "PARENTS",
    "PARENTS",
  ]);
  await assert.rejects(
    requestCoupleSeasonChange(matchSpace.userAId, "MARRIED"),
    (error: unknown) =>
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "INVALID_TRANSITION",
  );
  console.info("couple-space integrity: bilateral monotonic transition OK");

  const inviter = await createUser("inviter", "MARRIED");
  const intended = await createUser("intended");
  const wrongRecipient = await createUser("wrong");
  const external = await createExternalCoupleSpace(inviter.id);
  const invite = await issueCoupleInvite(inviter.id, intended.email);
  const storedInvite = await prisma.coupleSpace.findUniqueOrThrow({
    where: { id: external.spaceId },
  });
  assert.equal(storedInvite.inviteCode, null);
  assert.equal(storedInvite.inviteCodeHash, invite.codeHash);
  assert.notEqual(storedInvite.inviteCodeHash, invite.code);
  assert.ok(storedInvite.inviteExpiresAt);

  await assert.rejects(
    joinCoupleSpaceByInvite(wrongRecipient.id, invite.code),
    (error: unknown) =>
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "CODE_INVALID",
  );
  console.info("couple-space integrity: bound single-use invite OK");
  await joinCoupleSpaceByInvite(intended.id, invite.code);
  const consumedInvite = await prisma.coupleSpace.findUniqueOrThrow({
    where: { id: external.spaceId },
  });
  assert.equal(consumedInvite.status, "ACTIVE");
  assert.equal(consumedInvite.inviteCodeHash, null);
  assert.equal(consumedInvite.inviteEmailHash, null);
  assert.equal(consumedInvite.inviteExpiresAt, null);
  await assert.rejects(
    joinCoupleSpaceByInvite(wrongRecipient.id, invite.code),
    (error: unknown) =>
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "CODE_INVALID",
  );

  const shared = await createUser("shared");
  const left = await createUser("left");
  const right = await createUser("right");
  const crossRoleResults = await Promise.allSettled([
    prisma.coupleSpace.create({
      data: {
        userAId: shared.id,
        userBId: left.id,
        pairKey: [shared.id, left.id].sort().join(":"),
        status: "PENDING",
        inviteCode: null,
      },
    }),
    prisma.coupleSpace.create({
      data: {
        userAId: right.id,
        userBId: shared.id,
        pairKey: [right.id, shared.id].sort().join(":"),
        status: "PENDING",
        inviteCode: null,
      },
    }),
  ]);
  assert.equal(
    crossRoleResults.filter(({ status }) => status === "fulfilled").length,
    1,
  );
  console.info("couple-space integrity: cross-role concurrency guard OK");

  console.info(
    "couple-space integrity: concurrent creation, bilateral transition, bound single-use invite, cross-role guard OK",
  );
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
