import { prisma } from "@/lib/db";
import { openInsight } from "@/lib/agent-insight";

// Surface anti-arnaque côté utilisateur : on lit le dernier signal du Veilleur
// (watchman) pour un match. Seuls les signaux de sévérité HIGH (extraction
// financière, héritage/loterie, carte cadeau/crypto) sont montrés aux membres ;
// le reste demeure côté modération.
export type SafetySignal = {
  flagged: boolean;
  severity: "none" | "medium" | "high";
  signals: string[];
};

export async function getSafetySignalForMatch(
  matchId: string,
): Promise<SafetySignal> {
  const insight = await prisma.agentInsight.findFirst({
    where: { matchId, agentId: "watchman", kind: "SAFETY_SIGNAL" },
    orderBy: { createdAt: "desc" },
  });
  if (!insight) return { flagged: false, severity: "none", signals: [] };

  const data = openInsight<{
    signals?: string[];
    severity?: "none" | "medium" | "high";
  }>(insight.dataJson);
  if (data === null) {
    console.warn("[safety-signal] déchiffrement impossible", insight.id);
    return { flagged: false, severity: "none", signals: [] };
  }

  const severity = data.severity ?? "none";
  if (severity !== "high") {
    return { flagged: false, severity, signals: [] };
  }
  return { flagged: true, severity, signals: data.signals ?? [] };
}
