/**
 * Feature flags lisibles client ET serveur.
 *
 * `NEXT_PUBLIC_*` est inliné par Next à la compilation → on lit `process.env`
 * directement (PAS via le loader Zod serveur de `lib/env`, qui ne traverse pas
 * jusqu'au client). Absent / autre que "true" ⇒ désactivé.
 */

/**
 * Phase 2 - gate du profil avant le matching. OFF par défaut.
 * Quand ON : `getSuggestions` exige un profil 100 % complet
 * (cf. `lib/profile-completion`) ; la page Suggestions affiche la jauge
 * d'onboarding + la modale « profil incomplet ».
 */
export function isProfileGateEnabled(): boolean {
  return process.env.NEXT_PUBLIC_PHASE2_GATE_PROFILE === "true";
}
