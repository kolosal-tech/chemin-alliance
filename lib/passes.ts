import { prisma } from "@/lib/db";

// Passage unilatéral - GRATUIT À VIE (doctrine, lib/payments/entitlements).
// NON réciproque (≠ blocage) : seul l'auteur cesse de voir le profil passé ;
// l'autre peut toujours m'être proposé.

/** IDs des profils que J'AI passés (à exclure de MES suggestions). */
export async function passedUserIds(userId: string): Promise<string[]> {
  const passes = await prisma.pass.findMany({
    where: { passerId: userId },
    select: { passedId: true },
  });
  return passes.map((p) => p.passedId);
}
