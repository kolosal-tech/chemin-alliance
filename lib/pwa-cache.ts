export const CLEAR_PRIVATE_CACHES_MESSAGE =
  "CHEMIN_ALLIANCE_CLEAR_PRIVATE_CACHES";

/**
 * Purge les données que d'anciennes versions du service worker ont pu mettre
 * en cache. L'opération est best-effort : une déconnexion serveur réussie ne
 * doit jamais être annulée par une API PWA absente ou défaillante.
 */
export async function clearPrivatePwaCaches(): Promise<void> {
  try {
    if (typeof navigator !== "undefined") {
      navigator.serviceWorker?.controller?.postMessage(
        CLEAR_PRIVATE_CACHES_MESSAGE,
      );
    }
  } catch {
    // Le nettoyage direct via CacheStorage ci-dessous reste tenté.
  }

  try {
    if (typeof caches === "undefined") return;
    const names = await caches.keys();
    await Promise.all(names.map((cacheName) => caches.delete(cacheName)));
  } catch {
    // Best-effort : le cookie de session a déjà été invalidé côté serveur.
  }
}
