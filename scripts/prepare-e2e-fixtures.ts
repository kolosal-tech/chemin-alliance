import { PrismaClient, type LifeSeason } from "@prisma/client";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl || process.env.E2E_MANAGED_FIXTURES !== "1") {
  throw new Error("E2E_MANAGED_FIXTURES_AND_DATABASE_URL_REQUIRED");
}

const parsedUrl = new URL(databaseUrl);
const databaseName = parsedUrl.pathname.replace(/^\//, "");
const schema = parsedUrl.searchParams.get("schema");
const isLoopback = ["localhost", "127.0.0.1", "[::1]"].includes(
  parsedUrl.hostname,
);
const isIsolated =
  databaseName.startsWith("codex-") || schema?.startsWith("codex_e2e_");
if (process.env.NODE_ENV === "production" || !isLoopback || !isIsolated) {
  throw new Error(
    "REFUSING_NON_ISOLATED_DATABASE: use a local codex-* database or codex_e2e_* schema",
  );
}

const prisma = new PrismaClient();
const DEMO_BLURHASH = "LEHV6nWB2yk8pyo0adR*.7kCMdnj";

async function requiredUser(email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  });
  if (!user) throw new Error(`E2E_USER_NOT_SEEDED:${email}`);
  return user;
}

async function upsertCoupleFixture(input: {
  firstEmail: string;
  secondEmail: string;
  season: LifeSeason;
}) {
  const [first, second] = await Promise.all([
    requiredUser(input.firstEmail),
    requiredUser(input.secondEmail),
  ]);
  const [userAId, userBId] = [first.id, second.id].sort();
  const pairKey = `${userAId}:${userBId}`;

  await prisma.$transaction(async (tx) => {
    await tx.user.updateMany({
      where: { id: { in: [userAId, userBId] } },
      data: { season: input.season },
    });
    await tx.relationshipProfile.updateMany({
      where: { userId: { in: [userAId, userBId] } },
      data: {
        maritalStatus: input.season === "ENGAGED" ? "engaged" : "married",
      },
    });
    const existing = await tx.coupleSpace.findUnique({
      where: { pairKey },
      select: { id: true },
    });
    const mutableData = {
      status: "ACTIVE" as const,
      season: input.season,
      marriedAt: input.season === "MARRIED" ? new Date("2025-07-23") : null,
      inviteCode: null,
      inviteCodeHash: null,
      inviteEmailHash: null,
      inviteExpiresAt: null,
    };
    if (existing) {
      await tx.coupleSpace.update({
        where: { id: existing.id },
        data: mutableData,
      });
    } else {
      await tx.coupleSpace.create({
        data: {
          userAId,
          userBId,
          pairKey,
          origin: "EXTERNAL",
          ...mutableData,
        },
      });
    }
  });
}

async function ensureSensitiveConsentActive(userId: string) {
  const active = await prisma.consent.findFirst({
    where: {
      userId,
      type: "SENSITIVE_DATA_PROCESSING",
      revokedAt: null,
    },
    select: { id: true },
  });
  if (!active) {
    await prisma.consent.create({
      data: {
        userId,
        type: "SENSITIVE_DATA_PROCESSING",
        version: "sensitive-data-processing:v1",
        purpose: "CORE_RELATIONSHIP_AND_FAITH_SERVICE",
        recipient: "CHEMIN_ALLIANCE_CORE_SERVICE",
      },
    });
  }
  await prisma.privacySettings.upsert({
    where: { userId },
    create: { userId, invisibleMode: false },
    update: { invisibleMode: false },
  });
}

async function main() {
  const [jonathan, elodie, marieClaire, david, sarah, emmanuel] =
    await Promise.all([
      requiredUser("jonathan@demo.chemin-alliance.app"),
      requiredUser("elodie@demo.chemin-alliance.app"),
      requiredUser("marie-claire@demo.chemin-alliance.app"),
      requiredUser("david@demo.chemin-alliance.app"),
      requiredUser("sarah@demo.chemin-alliance.app"),
      requiredUser("emmanuel@demo.chemin-alliance.app"),
    ]);

  await Promise.all(
    [jonathan, elodie, marieClaire, david, sarah, emmanuel].map((user) =>
      ensureSensitiveConsentActive(user.id),
    ),
  );

  await upsertCoupleFixture({
    firstEmail: david.email,
    secondEmail: sarah.email,
    season: "ENGAGED",
  });
  await upsertCoupleFixture({
    firstEmail: emmanuel.email,
    secondEmail: elodie.email,
    season: "MARRIED",
  });

  const gameMatch = await prisma.match.findFirst({
    where: {
      status: "ACTIVE",
      OR: [
        { userAId: jonathan.id, userBId: elodie.id },
        { userAId: elodie.id, userBId: jonathan.id },
      ],
    },
    select: { id: true },
  });
  const watchmanMatch = await prisma.match.findFirst({
    where: {
      status: "ACTIVE",
      OR: [
        { userAId: david.id, userBId: sarah.id },
        { userAId: sarah.id, userBId: david.id },
      ],
    },
    select: { id: true },
  });
  if (!gameMatch || !watchmanMatch) {
    throw new Error("E2E_ACTIVE_MATCHES_NOT_SEEDED");
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: jonathan.id },
      data: {
        lastDevotionDate: null,
        onboardingDoneAt: new Date("2025-07-23"),
      },
    }),
    prisma.user.update({
      where: { id: marieClaire.id },
      data: { photoBlurhash: DEMO_BLURHASH },
    }),
    prisma.gameRound.deleteMany({ where: { matchId: gameMatch.id } }),
    prisma.agentInsight.deleteMany({
      where: { matchId: watchmanMatch.id, agentId: "watchman" },
    }),
  ]);

  console.info(
    JSON.stringify({
      gameEmail: jonathan.email,
      gameMatchId: gameMatch.id,
      coupleEmail: emmanuel.email,
      engagedEmail: david.email,
      marriedEmail: emmanuel.email,
      watchmanEmail: sarah.email,
      watchmanMatchId: watchmanMatch.id,
    }),
  );
  console.info("E2E_MANAGED_FIXTURES_READY");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
