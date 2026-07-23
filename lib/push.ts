import webpush from "web-push";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { activeSensitiveDataConsentUserWhere } from "@/lib/sensitive-data-consent";

/**
 * Web Push (PWA, iOS 16.4+ / Android).
 *
 * Doctrine "dormant sans clés" (cf. Twilio/Stripe) : sans paire VAPID,
 * `pushEnabled()` est faux, l'opt-in est masqué et aucun envoi n'est tenté.
 * Tout envoi est best-effort : une erreur réseau ne doit JAMAIS casser
 * l'envoi d'un message ou l'acceptation d'une demande.
 */

let configured = false;

export function pushEnabled(): boolean {
  return Boolean(
    env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY && env.WEB_PUSH_PRIVATE_KEY,
  );
}

function ensureConfigured(): boolean {
  if (!pushEnabled()) return false;
  if (!configured) {
    webpush.setVapidDetails(
      env.WEB_PUSH_EMAIL,
      env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY!,
      env.WEB_PUSH_PRIVATE_KEY!,
    );
    configured = true;
  }
  return true;
}

export type PushPayload = {
  title: string;
  body: string;
  /** Route ouverte au clic (locale-aware, ex. `/fr/messages/abc`). */
  url?: string;
  /** Regroupe/écrase les notifications d'un même fil (ex. `msg-<matchId>`). */
  tag?: string;
};

// L'envoi est awaité dans la requête (serverless tue les promesses détachées).
// Ce timeout borne la latence ajoutée : un service push lent ne doit pas faire
// traîner l'envoi d'un message.
const SEND_TIMEOUT_MS = 6000;
function withTimeout<T>(p: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<T>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error("push timeout")),
      SEND_TIMEOUT_MS,
    );
  });
  return Promise.race([p, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Envoi best-effort à tous les devices d'un utilisateur.
 * - Avale toute erreur (log seulement) : jamais bloquant.
 * - Purge les abonnements expirés (404/410) pour garder la table propre.
 * Retourne le nombre d'envois réussis (0 si push désactivé / aucun device).
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<number> {
  if (!ensureConfigured()) return 0;

  let subs;
  try {
    subs = await prisma.pushSubscription.findMany({
      where: {
        userId,
        // Dernière barrière avant tout transfert à un service Push tiers. Une
        // route appelante ne suffit pas : le destinataire peut avoir retiré
        // son consentement entre la décision métier et cet envoi best-effort.
        user: { is: activeSensitiveDataConsentUserWhere },
      },
    });
  } catch {
    // Les erreurs Prisma brutes peuvent contenir une valeur d'abonnement.
    console.error("[push] lecture abonnements indisponible");
    return 0;
  }
  if (subs.length === 0) return 0;

  const body = JSON.stringify(payload);
  const results = await Promise.allSettled(
    subs.map((s) =>
      withTimeout(
        webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body,
        ),
      ),
    ),
  );

  const expired: string[] = [];
  let ok = 0;
  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      ok += 1;
      return;
    }
    const code = (r.reason as { statusCode?: number })?.statusCode;
    // Purge des abonnements DÉFINITIVEMENT morts (sinon ils restent en base et
    // chaque envoi futur échoue en silence - profil typique du « ça marchait,
    // puis plus aucune notif ») :
    //  - 404 : endpoint disparu ;
    //  - 410 : abonnement révoqué côté device ;
    //  - 403 : « VAPID credentials mismatch ». La paire VAPID du serveur a changé
    //    (rotation de clé) : cet abonnement ne pourra PLUS JAMAIS recevoir. On le
    //    purge pour que le ré-opt-in (Réglages > Notifications) reparte propre.
    // On NE purge PAS sur 400 (payload, notre faute, transitoire) ni 401 (auth
    // serveur, GLOBAL) : ces codes ne doivent pas effacer des abonnements valides.
    if (code === 404 || code === 410 || code === 403) expired.push(subs[i].id);
    else console.error(`[push] envoi échoué (${code ?? "transport"})`);
  });

  if (expired.length > 0) {
    await prisma.pushSubscription
      .deleteMany({ where: { id: { in: expired } } })
      .catch(() => console.error("[push] purge abonnements indisponible"));
  }
  return ok;
}
