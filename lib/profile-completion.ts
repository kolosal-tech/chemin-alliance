/**
 * Complétude du profil - logique PURE et testable, partagée par la jauge
 * (OnboardingProgress, façon Duolingo) et le gate fort de Phase 2.
 *
 * Le gate « minimum » (ville + intention) reste défini dans `lib/matching`
 * (`missingMinimumProfile`) et reste TOUJOURS actif. Ici on calcule une
 * complétude plus riche : `isComplete` n'alimente le matching QUE si le flag
 * `NEXT_PUBLIC_PHASE2_GATE_PROFILE` est activé (cf. `lib/flags`).
 *
 * Aucune écriture, aucune date : on lit des champs déjà chargés en session.
 */

export type ProfileSection =
  | "photo"
  | "city"
  | "intention"
  | "faith"
  | "family"
  | "aboutMe"
  | "verified";

/** Ordre d'affichage de la checklist. */
export const PROFILE_SECTIONS: ProfileSection[] = [
  "photo",
  "city",
  "intention",
  "faith",
  "family",
  "aboutMe",
  "verified",
];

export type CompletionInput = {
  isVerified: boolean;
  photoUrl: string | null;
  cityApprox: string | null;
  faithProfile: {
    denomination: string | null;
    engagementFrequency: string | null;
  } | null;
  relationshipProfile: {
    intentionStatement: string | null;
    wantsChildren: boolean | null;
    interests: string | null;
    personality: string | null;
    aspirations: string | null;
  } | null;
};

export type ProfileCompletion = {
  sections: { id: ProfileSection; done: boolean }[];
  done: number;
  total: number;
  /** entier 0..100 */
  percent: number;
  missing: ProfileSection[];
  isComplete: boolean;
};

const filled = (v: string | null | undefined): boolean => !!v?.trim();

/** Une section est-elle remplie ? Pur, sans effet de bord. */
export function sectionDone(
  section: ProfileSection,
  u: CompletionInput,
): boolean {
  switch (section) {
    case "photo":
      return filled(u.photoUrl);
    case "city":
      return filled(u.cityApprox);
    case "intention":
      return filled(u.relationshipProfile?.intentionStatement);
    case "faith":
      return (
        filled(u.faithProfile?.denomination) ||
        filled(u.faithProfile?.engagementFrequency)
      );
    case "family":
      // « vision familiale » exprimée = a répondu sur le désir d'enfants.
      return u.relationshipProfile?.wantsChildren != null;
    case "aboutMe":
      return (
        filled(u.relationshipProfile?.interests) ||
        filled(u.relationshipProfile?.personality) ||
        filled(u.relationshipProfile?.aspirations)
      );
    case "verified":
      return u.isVerified === true;
  }
}

/**
 * Le matching est-il bloqué pour cet utilisateur ? Pur, source unique partagée
 * par `getSuggestions` (serveur) et la page Suggestions (affichage).
 * Deux conditions DISTINCTES, derrière le flag Phase 2 :
 *   1. profil 100 % complet (`completion.isComplete`)
 *   2. onboarding fait (flag persistant `User.onboardingDoneAt`)
 * Flag OFF ⇒ jamais bloqué (comportement inchangé).
 */
export function matchingGateBlocked(o: {
  gateEnabled: boolean;
  completion: ProfileCompletion;
  onboardingDone: boolean;
}): boolean {
  return o.gateEnabled && (!o.completion.isComplete || !o.onboardingDone);
}

export function profileCompletion(u: CompletionInput): ProfileCompletion {
  const sections = PROFILE_SECTIONS.map((id) => ({
    id,
    done: sectionDone(id, u),
  }));
  const done = sections.filter((s) => s.done).length;
  const total = sections.length;
  const missing = sections.filter((s) => !s.done).map((s) => s.id);
  return {
    sections,
    done,
    total,
    percent: Math.round((done / total) * 100),
    missing,
    isComplete: done === total,
  };
}
