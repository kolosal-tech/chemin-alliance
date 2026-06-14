import crypto from "node:crypto";
import { env } from "@/lib/env";

/**
 * Envoi de SMS (vérification de numéro). Provider-agnostique, DORMANT par
 * défaut : sans clés Twilio en env, le code est seulement loggé côté serveur
 * (comme lib/email.ts en dev). Brancher Twilio = renseigner les 3 variables.
 *
 * GRATUIT côté utilisateur — la vérification protège, elle ne se monétise pas.
 */
const sid = process.env.TWILIO_ACCOUNT_SID;
const token = process.env.TWILIO_AUTH_TOKEN;
const from = process.env.TWILIO_FROM;
const smsConfigured = Boolean(sid && token && from);

/** Un prestataire SMS est-il configuré ? (sinon : mode dev, code loggé) */
export function smsEnabled(): boolean {
  return smsConfigured;
}

/** Code numérique à 6 chiffres, tirage cryptographique. */
export function generateCode(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

/** Empreinte HMAC du code (jamais stocké en clair). */
export function hashCode(code: string): string {
  return crypto.createHmac("sha256", env.JWT_SECRET).update(code).digest("hex");
}

/** Envoie un SMS. En mode dev (pas de clés), logge et renvoie true. */
export async function sendSms(to: string, body: string): Promise<boolean> {
  if (!smsConfigured) {
    console.info(`\n[sms] (dev — non envoyé) ${to}: ${body}\n`);
    return true;
  }
  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          authorization:
            "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
          "content-type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: to,
          From: from!,
          Body: body,
        }).toString(),
      },
    );
    if (!res.ok) {
      console.error(`[sms] Twilio ${res.status}`);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
