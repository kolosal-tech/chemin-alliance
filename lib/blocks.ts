import { prisma } from "@/lib/db";

// Blocage user-à-user - GRATUIT À VIE (doctrine, lib/payments/entitlements).
// Un blocage est SYMÉTRIQUE dans ses effets : les deux personnes deviennent
// mutuellement invisibles et ne peuvent plus échanger, quel que soit l'auteur.

/** IDs des personnes bloquées par moi OU qui m'ont bloqué (pour le matching). */
export async function blockedUserIds(userId: string): Promise<string[]> {
  const blocks = await prisma.block.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    select: { blockerId: true, blockedId: true },
  });
  const ids = new Set<string>();
  for (const b of blocks) {
    ids.add(b.blockerId);
    ids.add(b.blockedId);
  }
  ids.delete(userId);
  return [...ids];
}

/** Un blocage existe-t-il dans un sens OU l'autre entre deux personnes ? */
export async function isBlockedBetween(a: string, b: string): Promise<boolean> {
  const found = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: a, blockedId: b },
        { blockerId: b, blockedId: a },
      ],
    },
    select: { id: true },
  });
  return Boolean(found);
}
