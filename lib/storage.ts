import { randomUUID } from "node:crypto";
import { env } from "@/lib/env";
import { MAX_PROFILE_PHOTO_BYTES } from "@/lib/profile-photo";

/**
 * Photos de profil - Supabase Storage via l'API REST (pas de SDK).
 * Doctrine "dormant sans clés" : sans SUPABASE_URL + SERVICE_ROLE_KEY,
 * `photoUploadEnabled()` est faux et l'upload est refusé proprement.
 * Le SERVICE_ROLE_KEY ne quitte jamais le serveur (route runtime=nodejs).
 */

export function photoUploadEnabled(): boolean {
  return Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}

const EXT_BY_TYPE = new Map<string, string>([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);
export type UploadResult =
  | { ok: true; url: string }
  | { ok: false; error: "disabled" | "type" | "size" | "upload" };

/**
 * Upload best-effort d'une photo de profil. Chemin `<userId>/<uuid>.<ext>` :
 * non devinable, un dossier par utilisateur. Renvoie l'URL publique.
 */
export async function uploadProfilePhoto(
  userId: string,
  file: { type: string; bytes: ArrayBuffer | Buffer },
): Promise<UploadResult> {
  if (!photoUploadEnabled()) return { ok: false, error: "disabled" };
  const ext = EXT_BY_TYPE.get(file.type);
  if (!ext) return { ok: false, error: "type" };
  if (
    file.bytes.byteLength === 0 ||
    file.bytes.byteLength > MAX_PROFILE_PHOTO_BYTES
  ) {
    return { ok: false, error: "size" };
  }

  const bucket = env.SUPABASE_PHOTO_BUCKET;
  const base = env.SUPABASE_URL!.replace(/\/$/, "");
  const path = `${userId}/${randomUUID()}.${ext}`;

  const body = new ArrayBuffer(file.bytes.byteLength);
  new Uint8Array(body).set(
    Buffer.isBuffer(file.bytes) ? file.bytes : new Uint8Array(file.bytes),
  );

  let res: Response;
  try {
    res = await fetch(`${base}/storage/v1/object/${bucket}/${path}`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        "content-type": file.type,
        "cache-control": "public, max-age=31536000",
      },
      body,
    });
  } catch {
    // Une erreur HTTP brute peut contenir URL signée, headers ou payload.
    console.error("[storage] transport upload indisponible");
    return { ok: false, error: "upload" };
  }
  if (!res.ok) {
    // Le corps fournisseur peut refléter le chemin utilisateur.
    console.error(`[storage] upload refusé (${res.status})`);
    return { ok: false, error: "upload" };
  }
  return {
    ok: true,
    url: `${base}/storage/v1/object/public/${bucket}/${path}`,
  };
}

/**
 * Supprime l'original et sa variante floutée via l'API Storage. La fonction
 * renvoie false si une photo existe mais ne peut pas être supprimée : l'appelant
 * RGPD peut alors échouer sans annoncer à tort un effacement complet.
 */
export async function deleteProfilePhotoObjects(
  stored: string | null | undefined,
): Promise<boolean> {
  if (!stored) return true;
  if (!photoUploadEnabled()) return false;

  const bucket = env.SUPABASE_PHOTO_BUCKET;
  const path = extractPhotoPath(stored, bucket);
  if (!path) return false;
  const variant = blurredVariantPath(stored);
  const prefixes = [...new Set([path, variant].filter(Boolean))] as string[];
  const base = env.SUPABASE_URL!.replace(/\/$/, "");

  try {
    const res = await fetch(`${base}/storage/v1/object/${bucket}`, {
      method: "DELETE",
      headers: {
        authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ prefixes }),
    });
    if (!res.ok) {
      console.error("[storage] suppression photo refusée", res.status);
      return false;
    }
    return true;
  } catch {
    console.error("[storage] suppression photo réseau échouée");
    return false;
  }
}

/**
 * Extrait le chemin objet (`<userId>/<uuid>.<ext>`) d'une valeur stockée :
 * soit une URL publique/signée Supabase, soit déjà un chemin nu. `null` si on
 * ne sait pas l'interpréter (URL externe inattendue).
 */
export function extractPhotoPath(
  stored: string,
  bucket: string,
): string | null {
  for (const seg of [`/object/public/${bucket}/`, `/object/sign/${bucket}/`]) {
    const i = stored.indexOf(seg);
    if (i >= 0) return stored.slice(i + seg.length).split("?")[0];
  }
  // Valeur déjà sous forme de chemin nu (pas une URL http).
  if (!/^https?:\/\//.test(stored)) return stored.replace(/^\/+/, "");
  return null;
}

/**
 * URL de lecture MÊME-ORIGINE pour la photo de profil du compte courant, servie
 * par la route proxy `/api/me/photo/view`. Indispensable car le service worker
 * PWA (Workbox) casse les requêtes image cross-origin (Supabase) → net::ERR_FAILED.
 * Passer par une URL `'self'` règle aussi la CSP `img-src` et garde l'URL signée
 * côté serveur. Le suffixe `?v=` (dernier segment du chemin, change à chaque
 * upload) invalide le cache quand la photo change. `null` si pas de photo.
 */
export function photoProxyUrl(
  stored: string | null | undefined,
): string | null {
  if (!stored) return null;
  const version = stored.split("/").pop()?.split("?")[0] ?? "1";
  return `/api/me/photo/view?v=${encodeURIComponent(version)}`;
}

/**
 * URL de lecture SIGNÉE et à durée limitée pour une photo de profil - permet
 * un bucket privé (l'URL publique permanente n'est plus exposée). Best-effort :
 * sans clés, ou en cas d'échec, renvoie la valeur d'entrée telle quelle pour ne
 * jamais casser l'affichage (la vignette n'est qu'un aperçu du propriétaire).
 */
export async function signedPhotoUrl(
  stored: string | null,
  expiresInSec = 3600,
): Promise<string | null> {
  if (!stored) return null;
  if (!photoUploadEnabled()) return stored;
  const bucket = env.SUPABASE_PHOTO_BUCKET;
  const path = extractPhotoPath(stored, bucket);
  if (!path) return stored;
  const base = env.SUPABASE_URL!.replace(/\/$/, "");
  try {
    const res = await fetch(
      `${base}/storage/v1/object/sign/${bucket}/${path}`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ expiresIn: expiresInSec }),
      },
    );
    if (!res.ok) return stored;
    const { signedURL } = (await res.json()) as { signedURL?: string };
    if (!signedURL) return stored;
    return `${base}/storage/v1${signedURL.startsWith("/") ? "" : "/"}${signedURL}`;
  } catch {
    console.error("[storage] signature URL indisponible");
    return stored;
  }
}

/**
 * Chemin de la variante MOYENNEMENT floutée, sœur de l'original :
 * `<userId>/<uuid>.<ext>` → `<userId>/<uuid>.blur.jpg`. Déduit du chemin, donc
 * pas de colonne dédiée. `null` si on ne sait pas interpréter la valeur stockée.
 */
export function blurredVariantPath(stored: string): string | null {
  const path = extractPhotoPath(stored, env.SUPABASE_PHOTO_BUCKET);
  if (!path) return null;
  return path.replace(/\.[^./]+$/, "") + ".blur.jpg";
}

/**
 * Upload générique d'un buffer à un chemin précis du bucket photos (service
 * key, jamais côté client). `x-upsert` : réécrit si l'objet existe déjà
 * (re-upload de variante / backfill). Best-effort.
 */
export async function putPhotoObject(
  path: string,
  contentType: string,
  bytes: ArrayBuffer | Buffer,
): Promise<boolean> {
  if (!photoUploadEnabled()) return false;
  const bucket = env.SUPABASE_PHOTO_BUCKET;
  const base = env.SUPABASE_URL!.replace(/\/$/, "");
  // fetch n'accepte qu'un ArrayBuffer comme body (Buffer/Uint8Array refusés par
  // les types DOM depuis TS 5.7) → copie vers un ArrayBuffer propre.
  let body: ArrayBuffer;
  if (Buffer.isBuffer(bytes)) {
    body = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(body).set(bytes);
  } else {
    body = bytes;
  }
  try {
    const res = await fetch(`${base}/storage/v1/object/${bucket}/${path}`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        "content-type": contentType,
        "cache-control": "public, max-age=31536000",
        "x-upsert": "true",
      },
      body,
    });
    if (!res.ok) {
      console.error(`[storage] putPhotoObject refusé (${res.status})`);
      return false;
    }
    return true;
  } catch {
    console.error("[storage] transport putPhotoObject indisponible");
    return false;
  }
}
