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
  // DESACTIVE (decision fondateur, 24/06). Quand ce gate etait ON (via la
  // variable Vercel NEXT_PUBLIC_PHASE2_GATE_PROFILE="true"), getSuggestions
  // renvoyait une decouverte VIDE a tout utilisateur pas 100 % complet +
  // onboarde - Compagnons IA inclus. Cela annulait l'effet cold-start des
  // Compagnons : un nouvel inscrit voyait une page vide au lieu d'un vivier
  // vivant. On force donc le gate OFF ici, independamment de la variable
  // d'environnement. Pour le reactiver un jour, remettre :
  //   return process.env.NEXT_PUBLIC_PHASE2_GATE_PROFILE === "true";
  return false;
}
