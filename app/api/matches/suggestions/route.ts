import { NextResponse } from "next/server";
import { jsonError, withErrors } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";
import { rateLimit, LIMITS } from "@/lib/security/rate-limit";
import { getSuggestions } from "@/lib/matching";

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
  // Exposition minimale : jamais l'email, jamais les champs chiffrés.
  return NextResponse.json(
    suggestions.map((s) => ({
      id: s.id,
      displayName: s.displayName,
      age: s.age,
      isVerified: s.isVerified,
      photoBlurred: s.photoBlurredByDefault,
      vertical: s.faithProfile?.vertical ?? null,
      denomination: s.faithProfile?.denomination ?? null,
      maritalStatus: s.relationshipProfile?.maritalStatus ?? null,
      hasChildren: s.relationshipProfile?.hasChildren ?? false,
      wantsChildren: s.relationshipProfile?.wantsChildren ?? null,
      intentionStatement:
        s.relationshipProfile?.intentionVisibility === "PUBLIC_CONTROLLED"
          ? s.relationshipProfile?.intentionStatement
          : null,
    })),
  );
});
