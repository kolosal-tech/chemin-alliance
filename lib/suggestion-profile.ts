import type { FaithProfile, User } from "@prisma/client";

/**
 * DTO public d'une suggestion avant acceptation du match.
 *
 * Cette projection est volontairement une liste blanche centralisée : les
 * informations familiales (statut marital, enfants, désir d'enfants), la ville
 * et les champs chiffrés ne doivent jamais être sérialisés ni transmis au
 * composant client avant une relation ACTIVE.
 */
export type PreMatchSuggestionProfile = {
  id: string;
  displayName: string;
  age: number;
  isVerified: boolean;
  kind: User["kind"];
  photoBlurred: boolean;
  photoBlurhash: string | null;
  vertical: FaithProfile["vertical"] | null;
  denomination: string | null;
  intentionStatement: string | null;
  hasSponsor: boolean;
};

type SuggestionSource = {
  id: string;
  displayName: string;
  age: number;
  isVerified: boolean;
  kind: User["kind"];
  photoBlurredByDefault: boolean;
  photoBlurhash: string | null;
  faithProfile: Pick<FaithProfile, "vertical" | "denomination"> | null;
  relationshipProfile: {
    intentionStatement: string | null;
    intentionVisibility: string;
  } | null;
  sponsor?: unknown | null;
};

export function buildPreMatchSuggestionProfile(
  source: SuggestionSource,
): PreMatchSuggestionProfile {
  return {
    id: source.id,
    displayName: source.displayName,
    age: source.age,
    isVerified: source.isVerified,
    kind: source.kind,
    photoBlurred: source.photoBlurredByDefault,
    photoBlurhash: source.photoBlurhash,
    vertical: source.faithProfile?.vertical ?? null,
    denomination: source.faithProfile?.denomination ?? null,
    intentionStatement:
      source.relationshipProfile?.intentionVisibility === "PUBLIC_CONTROLLED"
        ? source.relationshipProfile.intentionStatement
        : null,
    hasSponsor: source.sponsor != null,
  };
}
