/**
 * Backfill applicatif des réponses Alliance créées avant la migration 0022.
 *
 * Prérequis :
 *   1. appliquer 0022_alliance_answer_encryption ;
 *   2. déployer le code qui écrit uniquement `answerEncrypted` ;
 *   3. exécuter avec les DATABASE_URL et ENCRYPTION_KEY de l'environnement :
 *        pnpm tsx scripts/backfill-alliance-answers.ts
 *
 * Le script est idempotent. Pour chaque ligne, il chiffre l'ancien clair puis
 * efface celui-ci dans la même mise à jour conditionnelle. Il ne journalise
 * jamais le contenu des réponses ni leur ciphertext.
 */
import { PrismaClient } from "@prisma/client";
import { sealAllianceAnswer } from "../lib/alliance-answer";

const prisma = new PrismaClient();
const BATCH_SIZE = 100;

async function main() {
  let migrated = 0;

  for (;;) {
    const batch = await prisma.allianceAnswer.findMany({
      where: {
        answerEncrypted: null,
      },
      select: {
        id: true,
        answerLegacy: true,
      },
      orderBy: { id: "asc" },
      take: BATCH_SIZE,
    });

    if (batch.length === 0) break;

    for (const row of batch) {
      const sealed = sealAllianceAnswer(row.answerLegacy);
      const result = await prisma.allianceAnswer.updateMany({
        where: {
          id: row.id,
          answerEncrypted: null,
        },
        data: sealed,
      });
      migrated += result.count;
    }
  }

  const [legacyRemaining, missingAnswer] = await Promise.all([
    prisma.allianceAnswer.count({
      where: { answerLegacy: { not: "" } },
    }),
    prisma.allianceAnswer.count({
      where: { answerEncrypted: null },
    }),
  ]);

  console.log(
    `[alliance-answer-backfill] migrated=${migrated} legacyRemaining=${legacyRemaining} missingAnswer=${missingAnswer}`,
  );
  if (legacyRemaining !== 0 || missingAnswer !== 0) {
    throw new Error("Backfill Alliance incomplet");
  }
}

main()
  .catch((error: unknown) => {
    const name = error instanceof Error ? error.name : "UnknownError";
    console.error(`[alliance-answer-backfill] failed=${name}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
