/// <reference lib="webworker" />
/**
 * Custom service worker (compilé et importé par @ducanh2912/next-pwa dans
 * le sw.js généré). Gère la réception des notifications push et le clic.
 * Exclu de la vérification de types Next (cf. tsconfig "exclude").
 */
declare const self: ServiceWorkerGlobalScope;

const CLEAR_PRIVATE_CACHES = "CHEMIN_ALLIANCE_CLEAR_PRIVATE_CACHES";
const LEGACY_PRIVATE_CACHES = new Set([
  "apis",
  "next-data",
  "pages",
  "pages-rsc",
  "pages-rsc-prefetch",
]);

async function deleteCaches(
  predicate: (cacheName: string) => boolean,
): Promise<void> {
  const names = await self.caches.keys();
  await Promise.all(
    names.filter(predicate).map((cacheName) => self.caches.delete(cacheName)),
  );
}

// Nettoie une fois les caches privés créés par les anciennes stratégies
// next-pwa. Les précaches et assets statiques restent disponibles hors ligne.
self.addEventListener("activate", (event: ExtendableEvent) => {
  event.waitUntil(
    deleteCaches(
      (cacheName) =>
        LEGACY_PRIVATE_CACHES.has(cacheName) || cacheName.startsWith("pages-"),
    ),
  );
});

// Le client envoie ce message après une déconnexion. On purge alors TOUS les
// caches de l'origine : la confidentialité prime sur le coût de retéléchargement
// de quelques assets statiques lors de la session suivante.
self.addEventListener("message", (event: ExtendableMessageEvent) => {
  if (event.data !== CLEAR_PRIVATE_CACHES) return;
  event.waitUntil(deleteCaches(() => true));
});

self.addEventListener("push", (event: PushEvent) => {
  let data: { title?: string; body?: string; url?: string; tag?: string } = {};
  try {
    if (event.data) data = event.data.json();
  } catch {
    data = {};
  }

  const title = data.title || "Chemin d'Alliance";
  const options: NotificationOptions = {
    body: data.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: data.tag,
    data: { url: data.url || "/fr" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  const target =
    (event.notification.data as { url?: string } | undefined)?.url || "/fr";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientsArr) => {
        for (const client of clientsArr) {
          if (client.url.includes(target) && "focus" in client) {
            return client.focus();
          }
        }
        return self.clients.openWindow(target);
      })
      .catch(() => undefined),
  );
});

export {};
