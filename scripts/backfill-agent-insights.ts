import { prisma } from "@/lib/db";
import { isLegacyInsightValue, sealInsight } from "@/lib/agent-insight";

/**
 * Chiffre les AgentInsight historiques encore stockés comme objets JSON.
 *
 * Dry-run par défaut :
 *   pnpm backfill:agent-insights
 * Écriture explicite :
 *   pnpm backfill:agent-insights -- --apply
 *
 * Aucun contenu n'est journalisé.
 */
async function main() {
  const apply = process.argv.includes("--apply");
  let cursor: string | undefined;
  let scanned = 0;
  let legacy = 0;
  let updated = 0;

  for (;;) {
    const rows = await prisma.agentInsight.findMany({
      select: { id: true, dataJson: true },
      orderBy: { id: "asc" },
      take: 250,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    if (rows.length === 0) break;

    for (const row of rows) {
      scanned += 1;
      if (!isLegacyInsightValue(row.dataJson)) continue;
      legacy += 1;
      if (!apply) continue;
      await prisma.agentInsight.update({
        where: { id: row.id },
        data: { dataJson: sealInsight(row.dataJson) },
      });
      updated += 1;
    }
    cursor = rows.at(-1)?.id;
  }

  console.log(
    JSON.stringify({
      mode: apply ? "apply" : "dry-run",
      scanned,
      legacy,
      updated,
    }),
  );
}

main()
  .catch(() => {
    console.error("[backfill-agent-insights] échec");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
