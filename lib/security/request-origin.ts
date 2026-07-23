const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

type RequestOriginInput = {
  method: string;
  requestOrigin: string;
  originHeader: string | null;
  secFetchSite: string | null;
};

type RequestTargetOriginInput = {
  nextUrlOrigin: string;
  hostHeader: string | null;
  forwardedHostHeader: string | null;
  forwardedProtoHeader: string | null;
};

function firstForwardedValue(value: string | null): string | null {
  return value?.split(",", 1)[0]?.trim() || null;
}

/**
 * Reconstruit l'origine effectivement visée par le navigateur.
 *
 * Next peut normaliser `req.nextUrl.origin` vers `localhost` en développement,
 * même lorsque le Host reçu est `127.0.0.1`. Derrière un proxy TLS, le protocole
 * public est porté par X-Forwarded-Proto. Le Host direct reste prioritaire :
 * un navigateur ne peut pas le forger indépendamment de l'URL demandée.
 */
export function requestTargetOrigin({
  nextUrlOrigin,
  hostHeader,
  forwardedHostHeader,
  forwardedProtoHeader,
}: RequestTargetOriginInput): string {
  const host = hostHeader?.trim() || firstForwardedValue(forwardedHostHeader);
  if (!host) return nextUrlOrigin;

  let fallbackProtocol: string;
  try {
    fallbackProtocol = new URL(nextUrlOrigin).protocol;
  } catch {
    fallbackProtocol = "https:";
  }
  const forwardedProtocol = firstForwardedValue(forwardedProtoHeader);
  const protocol =
    forwardedProtocol === "http" || forwardedProtocol === "https"
      ? `${forwardedProtocol}:`
      : fallbackProtocol;

  try {
    return new URL(`${protocol}//${host}`).origin;
  } catch {
    return nextUrlOrigin;
  }
}

/**
 * Défense CSRF de bordure.
 *
 * Les appels serveur-à-serveur légitimes (webhooks) n'envoient généralement ni
 * Origin ni Sec-Fetch-Site et restent autorisés. Un navigateur cross-site est
 * rejeté avant lecture du body, même pour une route sans payload JSON.
 */
export function isUntrustedMutationRequest({
  method,
  requestOrigin,
  originHeader,
  secFetchSite,
}: RequestOriginInput): boolean {
  if (!MUTATING_METHODS.has(method.toUpperCase())) return false;
  if (secFetchSite?.toLowerCase() === "cross-site") return true;
  if (!originHeader) return false;

  try {
    return new URL(originHeader).origin !== new URL(requestOrigin).origin;
  } catch {
    return true;
  }
}
