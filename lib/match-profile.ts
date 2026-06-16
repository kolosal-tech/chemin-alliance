import type { AllianceStage, VisibilityLevel } from "@prisma/client";
import { canSeeField } from "./visibility";
import { decryptOptional } from "./security/crypto";

/**
 * Vue « profil du match » : applique l'exposition progressive (canSeeField)
 * aux champs sensibles de l'autre membre et ne déchiffre que ce qui est visible
 * à l'étape courante. Aucune donnée verrouillée ne quitte le serveur déchiffrée.
 */

export type MatchProfileFieldKey =
  | "intention"
  | "testimony"
  | "children"
  | "familyVision"
  | "localChurch";

export type MatchProfileField = {
  key: MatchProfileFieldKey;
  visible: boolean;
  /** Valeur résolue (texte déchiffré, ou "yes"/"no" pour les booléens) si visible ; null sinon. */
  value: string | null;
  /** Étape d'alliance (1..6) à laquelle le champ se déverrouille — pour le libellé verrouillé. */
  unlocksAtStep: number;
};

export type FaithInput = {
  testimonyEncrypted: string | null;
  testimonyVisibility: VisibilityLevel;
  localChurchEncrypted: string | null;
  localChurchVisibility: VisibilityLevel;
} | null;

export type RelationshipInput = {
  intentionStatement: string | null;
  intentionVisibility: VisibilityLevel;
  hasChildren: boolean;
  childrenVisibility: VisibilityLevel;
  familyVisionEncrypted: string | null;
  familyVisionVisibility: VisibilityLevel;
} | null;

export type MatchProfileInput = {
  faith: FaithInput;
  relationship: RelationshipInput;
};

export type ViewerContext = { matched: boolean; stage: AllianceStage | null };

/** Étape (1..6) à laquelle un VisibilityLevel se déverrouille ; 99 = jamais pour un match. */
function unlocksAtStep(level: VisibilityLevel): number {
  switch (level) {
    case "PUBLIC_CONTROLLED":
    case "AFTER_MATCH":
      return 1;
    case "AFTER_DIALOGUE":
      return 2;
    case "AFTER_DISCERNMENT":
      return 3;
    case "COACH_ONLY":
    case "PRIVATE":
    case "MANUAL_SHARE":
      return 99;
  }
}

export function buildMatchProfileView(
  profile: MatchProfileInput,
  viewer: ViewerContext,
): MatchProfileField[] {
  const fields: MatchProfileField[] = [];
  const ctx = { matched: viewer.matched, stage: viewer.stage };

  const { relationship: rel, faith } = profile;

  if (rel) {
    const intentionVisible = canSeeField(rel.intentionVisibility, ctx);
    fields.push({
      key: "intention",
      visible: intentionVisible,
      value: intentionVisible ? rel.intentionStatement : null,
      unlocksAtStep: unlocksAtStep(rel.intentionVisibility),
    });
  }

  if (faith) {
    const testimonyVisible = canSeeField(faith.testimonyVisibility, ctx);
    fields.push({
      key: "testimony",
      visible: testimonyVisible,
      value: testimonyVisible ? decryptOptional(faith.testimonyEncrypted) : null,
      unlocksAtStep: unlocksAtStep(faith.testimonyVisibility),
    });
  }

  if (rel) {
    const childrenVisible = canSeeField(rel.childrenVisibility, ctx);
    fields.push({
      key: "children",
      visible: childrenVisible,
      value: childrenVisible ? (rel.hasChildren ? "yes" : "no") : null,
      unlocksAtStep: unlocksAtStep(rel.childrenVisibility),
    });

    const familyVisible = canSeeField(rel.familyVisionVisibility, ctx);
    fields.push({
      key: "familyVision",
      visible: familyVisible,
      value: familyVisible ? decryptOptional(rel.familyVisionEncrypted) : null,
      unlocksAtStep: unlocksAtStep(rel.familyVisionVisibility),
    });
  }

  if (faith) {
    const churchVisible = canSeeField(faith.localChurchVisibility, ctx);
    fields.push({
      key: "localChurch",
      visible: churchVisible,
      value: churchVisible ? decryptOptional(faith.localChurchEncrypted) : null,
      unlocksAtStep: unlocksAtStep(faith.localChurchVisibility),
    });
  }

  return fields;
}
