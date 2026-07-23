import { NextResponse } from "next/server";
import { jsonError, withErrors } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";
import { rateLimit, LIMITS } from "@/lib/security/rate-limit";
import { getSuggestions } from "@/lib/matching";
import { buildPreMatchSuggestionProfile } from "@/lib/suggestion-profile";

export const GET = withErrors(async () => {
  const user = await requireUser();
  // Anti-scraping : un membre ne peut pas balayer tout le vivier en boucle.
  const rl = await rateLimit(
    `suggestions:${user.id}`,
    LIMITS.suggestions.limit,
    LIMITS.suggestions.windowMs,
  );
  if (!rl.allowed) return jsonError(429, "RATE_LIMITED");
  const suggestions = await getSuggestions(user);
  // Projection en liste blanche : aucun champ familial/privé ne quitte le
  // serveur avant l'acceptation d'un match.
  return NextResponse.json(suggestions.map(buildPreMatchSuggestionProfile));
});
