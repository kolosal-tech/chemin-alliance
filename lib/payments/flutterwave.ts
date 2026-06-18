/**
 * Rail Mobile Money (Afrique francophone, XOF) via Flutterwave — palier local.
 *
 * Doctrine "dormant sans clés" (comme storage/push/Stripe) : sans
 * FLUTTERWAVE_SECRET_KEY, `flutterwaveEnabled()` est faux et toute tentative de
 * paiement échoue proprement (503). La clé secrète ne quitte jamais le serveur.
 *
 * Surface testable PURE : `flutterwaveEnabled`, `verifyFlutterwaveSignature`
 * (vérif webhook à temps constant) et `buildMomoPaymentPayload`. L'appel HTTP
 * (`createMomoCheckout`) délègue au reste.
 */
import { randomUUID } from "node:crypto";

export function flutterwaveEnabled(): boolean {
  return Boolean(process.env.FLUTTERWAVE_SECRET_KEY);
}

/**
 * Vérifie un webhook Flutterwave : l'en-tête `verif-hash` doit égaler le secret
 * configuré (FLUTTERWAVE_WEBHOOK_HASH). Comparaison à temps constant pour ne pas
 * fuiter d'information par timing. Faux si secret ou en-tête absents.
 */
export function verifyFlutterwaveSignature(
  header: string | null | undefined,
): boolean {
  const secret = process.env.FLUTTERWAVE_WEBHOOK_HASH;
  if (!secret || !header) return false;
  if (header.length !== secret.length) return false;
  let diff = 0;
  for (let i = 0; i < secret.length; i++) {
    diff |= header.charCodeAt(i) ^ secret.charCodeAt(i);
  }
  return diff === 0;
}

export type MomoPaymentArgs = {
  userId: string;
  email: string;
  amountXof: number;
  redirectUrl: string;
  /** Référence de transaction ; générée si absente (déterministe en test). */
  txRef?: string;
};

export type MomoPaymentPayload = {
  tx_ref: string;
  amount: number;
  currency: "XOF";
  redirect_url: string;
  customer: { email: string };
  payment_options: "mobilemoneyfranco";
  meta: { userId: string };
  customizations: { title: string };
};

/** Corps de requête Flutterwave Standard (lien de paiement) — PUR, testable. */
export function buildMomoPaymentPayload(a: MomoPaymentArgs): MomoPaymentPayload {
  return {
    tx_ref: a.txRef ?? `ca-momo-${a.userId}-${randomUUID()}`,
    amount: a.amountXof,
    currency: "XOF",
    redirect_url: a.redirectUrl,
    customer: { email: a.email },
    // Mobile Money Afrique francophone (Orange/Moov Money, zone UEMOA).
    payment_options: "mobilemoneyfranco",
    meta: { userId: a.userId },
    customizations: { title: "Chemin d'Alliance — Premium" },
  };
}

export type MomoCheckout = { link: string; txRef: string };

/**
 * Crée un lien de paiement Mobile Money hébergé (≈ équivalent du checkout
 * Stripe). Dormant : lève 503 sans clé. Best-effort sur erreur réseau/API.
 */
export async function createMomoCheckout(
  a: MomoPaymentArgs,
): Promise<MomoCheckout> {
  const secret = process.env.FLUTTERWAVE_SECRET_KEY;
  if (!secret) {
    throw Object.assign(new Error("FLUTTERWAVE_DISABLED"), { status: 503 });
  }
  const payload = buildMomoPaymentPayload(a);
  let res: Response;
  try {
    res = await fetch("https://api.flutterwave.com/v3/payments", {
      method: "POST",
      headers: {
        authorization: `Bearer ${secret}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("[flutterwave] réseau échoué", err);
    throw Object.assign(new Error("FLUTTERWAVE_ERROR"), { status: 502 });
  }
  if (!res.ok) {
    console.error(
      "[flutterwave] paiement refusé",
      res.status,
      await res.text().catch(() => ""),
    );
    throw Object.assign(new Error("FLUTTERWAVE_ERROR"), { status: 502 });
  }
  const json = (await res.json()) as { data?: { link?: string } };
  const link = json.data?.link;
  if (!link) {
    throw Object.assign(new Error("FLUTTERWAVE_NO_LINK"), { status: 502 });
  }
  return { link, txRef: payload.tx_ref };
}
