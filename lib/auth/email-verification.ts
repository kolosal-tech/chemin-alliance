import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

/**
 * Durée de validité d'un lien de vérification d'email : 7 jours.
 *
 * 24 h était trop court : un mail tombé en spam (DNS pas encore durci) et
 * retrouvé le lendemain expirait, et le clic affichait « lien invalide ». 7
 * jours laisse le temps de le sortir du spam. Source unique partagée par
 * l'inscription, le changement d'email et le renvoi (resend) pour éviter le
 * drift entre les trois.
 */
export const EMAIL_VERIFY_TTL_MS = 7 * 24 * 60 * 60 * 1000;

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
  // Échec (lien manquant, invalide, déjà utilisé ou expiré) : on NE renvoie PAS
  // de JSON brut (un clic depuis l'email afficherait {"error":"TOKEN_..."}). On
  // redirige vers le login avec un drapeau ; l'i18n middleware localise, et la
  // page invite à se reconnecter pour renvoyer un lien (via VerifyBanner).
  const fail = () =>
    NextResponse.redirect(`${env.APP_URL}/login?verifyError=1`);

  if (!token) return fail();

  const user = await prisma.user.findUnique({
    where: { emailVerifyToken: token },
  });
  if (!user) return fail();
  if (
    user.emailVerifyExpires &&
    user.emailVerifyExpires.getTime() < Date.now()
  ) {
    return fail();
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      isVerified: true,
      emailVerifyToken: null,
      emailVerifyExpires: null,
    },
  });

  return NextResponse.redirect(
    `${env.APP_URL}/${user.locale}/login?verified=1`,
  );
}
