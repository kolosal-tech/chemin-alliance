import { prisma } from "@/lib/db";
import {
  AgentInsightIntegrityError,
  openInsightStrict,
} from "@/lib/agent-insight";

// Surface anti-arnaque côté utilisateur : on lit le dernier signal du Veilleur
// (watchman) pour un match. Seuls les signaux de sévérité HIGH (extraction
// financière, héritage/loterie, carte cadeau/crypto) sont montrés aux membres ;
// le reste demeure côté modération.
export type SafetySignal = {
  flagged: boolean;
  severity: "none" | "medium" | "high";
  signals: string[];
};

function failClosedSignal(insightId: string): SafetySignal {
  console.warn("[safety-signal] donnée illisible", insightId);
  return { flagged: true, severity: "high", signals: [] };
}

export async function getSafetySignalForMatch(
  matchId: string,
): Promise<SafetySignal> {
  const insight = await prisma.agentInsight.findFirst({
    where: { matchId, agentId: "watchman", kind: "SAFETY_SIGNAL" },
    orderBy: { createdAt: "desc" },
  });
  if (!insight) return { flagged: false, severity: "none", signals: [] };

  let data: unknown;
  try {
    data = openInsightStrict(insight.dataJson);
  } catch (error) {
    if (error instanceof AgentInsightIntegrityError) {
      return failClosedSignal(insight.id);
    }
    throw error;
  }
  if (
    typeof data !== "object" ||
    data === null ||
    !("severity" in data) ||
    !["none", "medium", "high"].includes(String(data.severity)) ||
    !("signals" in data) ||
    !Array.isArray(data.signals) ||
    !data.signals.every((signal) => typeof signal === "string")
  ) {
    return failClosedSignal(insight.id);
  }

  const severity = data.severity as "none" | "medium" | "high";
  if (severity !== "high") {
    return { flagged: false, severity, signals: [] };
  }
  return { flagged: true, severity, signals: data.signals };
}
