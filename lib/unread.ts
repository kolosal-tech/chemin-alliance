import { prisma } from "@/lib/db";

// Suivi des messages non lus par conversation. Le "lu" = lastReadAtUserA/B sur
// Match. Un message est non lu s'il vient de l'AUTRE membre (senderId != moi),
// de type USER, et postérieur à mon dernier lastReadAt.

/** Marque la conversation comme lue pour l'utilisateur courant (NOW). */
export async function markMatchAsRead(
  matchId: string,
  userId: string,
): Promise<void> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { userAId: true, userBId: true },
  });
  if (!match) return;
  const now = new Date();
  if (match.userAId === userId) {
    await prisma.match.update({
      where: { id: matchId },
      data: { lastReadAtUserA: now },
    });
  } else if (match.userBId === userId) {
    await prisma.match.update({
      where: { id: matchId },
      data: { lastReadAtUserB: now },
    });
  }
}

// Plafond de lignes chargées pour le comptage des non-lus : cette fonction
// est sondée fréquemment côté client (badge de navigation), donc on borne
// strictement le volume au lieu de charger un nombre illimité de messages.
// Un utilisateur avec autant de messages non lus d'un coup dépasse de toute
// façon largement ce qu'un badge peut afficher utilement.
const UNREAD_SCAN_LIMIT = 500;

/**
 * Nombre de messages non lus par conversation (seulement celles avec > 0).
 * Deux requêtes au total (pas de N+1) : les matchs, puis les messages
 * pertinents les plus récents (plafonnés à UNREAD_SCAN_LIMIT, triés par
 * date décroissante grâce à l'index [matchId, createdAt]) agrégés en
 * mémoire selon le lastReadAt propre à chaque match.
 */
export async function unreadByMatch(
  userId: string,
): Promise<Record<string, number>> {
  const matches = await prisma.match.findMany({
    where: {
      OR: [{ userAId: userId }, { userBId: userId }],
      status: { not: "CLOSED" },
    },
    select: {
      id: true,
      userAId: true,
      userBId: true,
      lastReadAtUserA: true,
      lastReadAtUserB: true,
    },
  });
  if (matches.length === 0) return {};

  const lastReadById = new Map<string, Date | null>();
  for (const m of matches) {
    lastReadById.set(
      m.id,
      m.userAId === userId ? m.lastReadAtUserA : m.lastReadAtUserB,
    );
  }

  const messages = await prisma.message.findMany({
    where: {
      matchId: { in: matches.map((m) => m.id) },
      kind: "USER",
      senderId: { not: userId },
    },
    select: { matchId: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: UNREAD_SCAN_LIMIT,
  });

  const result: Record<string, number> = {};
  for (const msg of messages) {
    const lastRead = lastReadById.get(msg.matchId);
    if (!lastRead || msg.createdAt > lastRead) {
      result[msg.matchId] = (result[msg.matchId] ?? 0) + 1;
    }
  }
  return result;
}

/** Total de messages non lus, tous matchs confondus. */
export async function totalUnread(userId: string): Promise<number> {
  const byMatch = await unreadByMatch(userId);
  return Object.values(byMatch).reduce((a, b) => a + b, 0);
}
