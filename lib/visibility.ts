import type { AllianceStage, VisibilityLevel } from "@prisma/client";

/**
 * Règle d'exposition progressive : un champ avec VisibilityLevel n'est
 * visible qu'à partir de l'étape correspondante du parcours.
 * COACH_ONLY / PRIVATE / MANUAL_SHARE ne sont jamais exposés à l'autre membre.
 */
const STAGE_ORDER: AllianceStage[] = [
  "DISCOVERY",
  "DIALOGUE",
  "DISCERNMENT",
  "ACCOMPANIMENT",
  "COMMITMENT",
  "MARRIAGE_PREPARATION",
];

export function stageIndex(stage: AllianceStage): number {
  return STAGE_ORDER.indexOf(stage);
}

export function canSeeField(
  level: VisibilityLevel,
  viewerContext: { matched: boolean; stage?: AllianceStage | null },
): boolean {
  switch (level) {
    case "PUBLIC_CONTROLLED":
      return true;
    case "AFTER_MATCH":
      return viewerContext.matched;
    case "AFTER_DIALOGUE":
      return (
        viewerContext.matched &&
        viewerContext.stage != null &&
        stageIndex(viewerContext.stage) >= stageIndex("DIALOGUE")
      );
    case "AFTER_DISCERNMENT":
      return (
        viewerContext.matched &&
        viewerContext.stage != null &&
        stageIndex(viewerContext.stage) >= stageIndex("DISCERNMENT")
      );
    case "COACH_ONLY":
    case "PRIVATE":
    case "MANUAL_SHARE":
      return false;
  }
}
