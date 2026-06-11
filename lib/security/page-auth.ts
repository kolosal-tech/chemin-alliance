import { redirect } from "@/i18n/navigation";
import { getSessionUser } from "@/lib/security/session";

/**
 * Garde d'authentification PAR PAGE : dans l'App Router, layout et page
 * rendent en parallèle — le layout seul ne suffit pas.
 */
export async function requirePageUser(locale: string) {
  const user = await getSessionUser();
  if (!user) redirect({ href: "/login", locale });
  return user!;
}
