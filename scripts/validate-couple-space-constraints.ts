import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";

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

const scenario = process.argv[2];
if (scenario !== "fk-restrict" && scenario !== "pair-required") {
  throw new Error("SCENARIO_REQUIRED: fk-restrict | pair-required");
}

const prisma = new PrismaClient();
const nonce = `${scenario}-${Date.now()}`;

async function createUser(label: string) {
  return prisma.user.create({
    data: {
      email: `${label}-${nonce}@example.test`,
      passwordHash: "integration-test-only",
      displayName: label,
      age: 30,
      isVerified: true,
      season: "MARRIED",
      relationshipProfile: { create: { maritalStatus: "married" } },
    },
  });
}

async function main() {
  const first = await createUser("constraint-a");
  const second = await createUser("constraint-b");

  if (scenario === "fk-restrict") {
    await prisma.coupleSpace.create({
      data: {
        userAId: first.id,
        userBId: second.id,
        pairKey: [first.id, second.id].sort().join(":"),
        status: "ACTIVE",
        inviteCode: null,
      },
    });
    // Dernière requête volontairement invalide : certains proxys locaux
    // ferment la connexion après une violation SQL, donc aucun accès ne suit.
    await assert.rejects(prisma.user.delete({ where: { id: second.id } }));
    console.info("couple-space constraints: hard member delete rejected");
    return;
  }

  await assert.rejects(
    prisma.coupleSpace.create({
      data: {
        userAId: first.id,
        userBId: second.id,
        status: "PENDING",
        inviteCode: null,
      },
    }),
  );
  console.info("couple-space constraints: missing canonical pair rejected");
}

main()
  .finally(async () => prisma.$disconnect())
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
