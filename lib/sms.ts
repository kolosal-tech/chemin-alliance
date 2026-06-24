import crypto from "node:crypto";
import { env } from "@/lib/env";

/**
 * Vérification du numéro de téléphone (anti-bot) via **Twilio Verify**.
 *
 * Twilio Verify gère lui-même la génération du code, l'envoi SMS, la livraison
 * MONDIALE (essentiel pour Afrique de l'Ouest / Brésil) et la protection contre
 * la fraude - pas de numéro à provisionner ni d'enregistrement A2P.
 *
 * DORMANT par défaut : sans les 3 variables Twilio, on retombe sur un code
 * auto-géré, seulement loggé côté serveur (mode dev). GRATUIT côté utilisateur.
 */
const sid = process.env.TWILIO_ACCOUNT_SID;
const token = process.env.TWILIO_AUTH_TOKEN;
const verifyService = process.env.TWILIO_VERIFY_SERVICE_SID;
const verifyConfigured = Boolean(sid && token && verifyService);

/** Twilio Verify est-il configuré ? (sinon : mode dev, code loggé) */
export function smsEnabled(): boolean {
  return verifyConfigured;
}

/** Code numérique à 6 chiffres, tirage cryptographique (repli dev seulement). */
export function generateCode(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

/** Empreinte HMAC du code (repli dev - jamais stocké en clair). */
export function hashCode(code: string): string {
  return crypto.createHmac("sha256", env.JWT_SECRET).update(code).digest("hex");
}

function basicAuth(): string {
  return "Basic " + Buffer.from(`${sid}:${token}`).toString("base64");
}

/**
 * Démarre une vérification : Twilio Verify envoie un code SMS au numéro.
 * Renvoie true si la demande a été acceptée par Twilio.
 */
export async function startVerification(to: string): Promise<boolean> {
  if (!verifyConfigured) return false;
  try {
    const res = await fetch(
      `https://verify.twilio.com/v2/Services/${verifyService}/Verifications`,
      {
        method: "POST",
        headers: {
          authorization: basicAuth(),
          "content-type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: to, Channel: "sms" }).toString(),
      },
    );
    if (!res.ok) {
      // On logge le code d'erreur Twilio (ex. 60xxx) + message en plus du status
      // HTTP : un 403 nu ne dit pas POURQUOI (geo-permissions, compte trial,
      // solde, numéro non vérifié...). Le code Twilio, lui, tranche.
      let detail = "";
      try {
        const e = (await res.json()) as { code?: number; message?: string };
        detail = ` code=${e.code ?? "?"} ${e.message ?? ""}`.trimEnd();
      } catch {
        /* corps non-JSON : on garde juste le status */
      }
      console.error(`[verify] Twilio start ${res.status}${detail}`);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Vérifie le code saisi auprès de Twilio Verify.
 * Renvoie true si `status === "approved"`.
 */
export async function checkVerification(
  to: string,
  code: string,
): Promise<boolean> {
  if (!verifyConfigured) return false;
  try {
    const res = await fetch(
      `https://verify.twilio.com/v2/Services/${verifyService}/VerificationCheck`,
      {
        method: "POST",
        headers: {
          authorization: basicAuth(),
          "content-type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: to, Code: code }).toString(),
      },
    );
    if (!res.ok) {
      let detail = "";
      try {
        const e = (await res.json()) as { code?: number; message?: string };
        detail = ` code=${e.code ?? "?"} ${e.message ?? ""}`.trimEnd();
      } catch {
        /* corps non-JSON */
      }
      console.error(`[verify] Twilio check ${res.status}${detail}`);
      return false;
    }
    const data = (await res.json()) as { status?: string };
    return data.status === "approved";
  } catch {
    return false;
  }
}
