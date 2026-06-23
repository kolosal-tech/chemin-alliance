import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/api-helpers";
import { env } from "@/lib/env";

/**
 * Vérifie un token de confirmation d'email puis redirige vers le login.
 *
 * Logique partagée par DEUX routes :
 *  - historique : `/api/auth/verify-email?token=<hex>` (rétro-compat) ;
 *  - actuelle   : `/api/auth/verify-email/<hex>` (segment de chemin).
 *
 * La route en chemin existe parce que le `=` de `?token=` est corrompu par
 * l'encodage quoted-printable des emails (le `=` suivi des 2 premiers chiffres
 * hex du token, ex. `=11`, est décodé en un octet de contrôle, ce qui détruit
 * le paramètre). Sans `=` dans l'URL, le danger disparaît structurellement.
 */
export async function verifyEmailToken(
  token: string | null | undefined,
): Promise<NextResponse> {
  if (!token) return jsonError(400, "TOKEN_REQUIRED");

  const user = await prisma.user.findUnique({
    where: { emailVerifyToken: token },
  });
  if (!user) return jsonError(400, "TOKEN_INVALID");
  if (
    user.emailVerifyExpires &&
    user.emailVerifyExpires.getTime() < Date.now()
  ) {
    return jsonError(400, "TOKEN_EXPIRED");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { isVerified: true, emailVerifyToken: null, emailVerifyExpires: null },
  });

  return NextResponse.redirect(`${env.APP_URL}/${user.locale}/login?verified=1`);
}
