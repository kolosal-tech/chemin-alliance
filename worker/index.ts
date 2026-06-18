/// <reference lib="webworker" />
/**
 * Custom service worker (compilé et importé par @ducanh2912/next-pwa dans
 * le sw.js généré). Gère la réception des notifications push et le clic.
 * Exclu de la vérification de types Next (cf. tsconfig "exclude").
 */
declare const self: ServiceWorkerGlobalScope;

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
