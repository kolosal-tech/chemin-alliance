import { env } from "@/lib/env";

/**
 * Envoi d'email transactionnel.
 * v1 : en développement, le lien est loggé côté serveur (cf. README).
 * Brancher Resend/SMTP ici pour la production (interface stable).
 */
export async function sendVerificationEmail(email: string, token: string) {
  const link = `${env.APP_URL}/api/auth/verify-email?token=${token}`;
  if (env.NODE_ENV !== "production") {
    console.info(`\n[email] Lien de vérification pour ${email} :\n${link}\n`);
    return;
  }
  // TODO production : brancher un fournisseur (Resend, Postmark, SES).
  console.info(`[email] verification requested for ${email}`);
}
