import { NextResponse } from "next/server";
import { withErrors } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";
import { getSuggestions } from "@/lib/matching";

export const GET = withErrors(async () => {
  const user = await requireUser();
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
