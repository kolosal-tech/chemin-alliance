import type { PushPayload } from "@/lib/push";

/**
 * Textes des notifications push, localisés par destinataire (fr/en/es/pt).
 *
 * Confidentialité (doctrine de l'app) : une notification ne révèle NI le
 * contenu d'un message (chiffré au repos) NI l'identité de l'autre personne.
 * Titre neutre = nom de l'app ; corps = action générique. Discret sur l'écran
 * de verrouillage. (matchId dans url/tag = payload chiffré RFC 8291, jamais
 * visible du service push, sert au deep-link/regroupement côté device.)
 */

type Loc = "fr" | "en" | "es" | "pt";
const SUPPORTED: readonly string[] = ["fr", "en", "es", "pt"];
const APP_NAME = "Chemin d'Alliance";

function loc(raw: string | null | undefined): Loc {
  return (SUPPORTED.includes(raw ?? "") ? raw : "fr") as Loc;
}

/** Nouveau message reçu. */
export function newMessageNotification(
  rawLocale: string | null | undefined,
  matchId: string,
): PushPayload {
  const l = loc(rawLocale);
  const body = {
    fr: "Vous avez reçu un nouveau message",
    en: "You have a new message",
    es: "Tienes un mensaje nuevo",
    pt: "Tem uma nova mensagem",
  }[l];
  return {
    title: APP_NAME,
    body,
    url: `/${l}/messages/${matchId}`,
    tag: `msg-${matchId}`,
  };
}

/** Nouvelle demande de rencontre reçue. */
export function newRequestNotification(
  rawLocale: string | null | undefined,
): PushPayload {
  const l = loc(rawLocale);
  const body = {
    fr: "Nouvelle demande de rencontre",
    en: "New connection request",
    es: "Nueva solicitud de encuentro",
    pt: "Novo pedido de encontro",
  }[l];
  return { title: APP_NAME, body, url: `/${l}/messages`, tag: "match-request" };
}

/** Demande acceptée : le demandeur peut désormais échanger. */
export function requestAcceptedNotification(
  rawLocale: string | null | undefined,
  matchId: string,
): PushPayload {
  const l = loc(rawLocale);
  const body = {
    fr: "Votre demande a été acceptée",
    en: "Your request was accepted",
    es: "Tu solicitud fue aceptada",
    pt: "O seu pedido foi aceite",
  }[l];
  return {
    title: APP_NAME,
    body,
    url: `/${l}/messages/${matchId}`,
    tag: `accept-${matchId}`,
  };
}
