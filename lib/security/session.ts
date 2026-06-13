import { cache } from "react";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE, verifySession } from "@/lib/security/jwt";

/**
 * Mémoïsé par requête (React cache) : layout + page + helpers partagent
 * UNE seule requête DB par rendu au lieu de 3. Sur l'App Router, le layout
 * et la page rendent en parallèle et appelaient chacun cette fonction.
 */
export const getSessionUser = cache(async () => {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifySession(token);
  if (!payload) return null;
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    include: {
      faithProfile: true,
      relationshipProfile: true,
      privacySettings: true,
    },
  });
  // Compte soft-supprimé (RGPD) : session invalide.
  if (user?.deletedAt) return null;
  return user;
});

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) {
    throw Object.assign(new Error("UNAUTHORIZED"), { status: 401 });
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    throw Object.assign(new Error("FORBIDDEN"), { status: 403 });
  }
  return user;
}
