import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrors } from "@/lib/api-helpers";

// Champs "vitrine" uniquement : liste publique (pas d'authentification), donc
// pas de risque de sur-projection accidentelle si le modèle Coach gagne un
// jour un champ interne (ex. notes admin, coordonnées privées).
export const GET = withErrors(async () => {
  const coaches = await prisma.coach.findMany({
    orderBy: { ratingAvg: "desc" },
    select: {
      id: true,
      displayName: true,
      photoUrl: true,
      certified: true,
      specialties: true,
      affiliation: true,
      bio: true,
      pricePerSessionEUR: true,
      ratingAvg: true,
      reviewsCount: true,
    },
  });
  return NextResponse.json(coaches);
});
