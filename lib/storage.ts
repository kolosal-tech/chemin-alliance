import { randomUUID } from "node:crypto";
import { env } from "@/lib/env";

/**
 * Photos de profil — Supabase Storage via l'API REST (pas de SDK).
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
const MAX_BYTES = 5 * 1024 * 1024; // 5 Mo

export type UploadResult =
  | { ok: true; url: string }
  | { ok: false; error: "disabled" | "type" | "size" | "upload" };

/**
 * Upload best-effort d'une photo de profil. Chemin `<userId>/<uuid>.<ext>` :
 * non devinable, un dossier par utilisateur. Renvoie l'URL publique.
 */
export async function uploadProfilePhoto(
  userId: string,
  file: { type: string; bytes: ArrayBuffer },
): Promise<UploadResult> {
  if (!photoUploadEnabled()) return { ok: false, error: "disabled" };
  const ext = EXT_BY_TYPE.get(file.type);
  if (!ext) return { ok: false, error: "type" };
  if (file.bytes.byteLength > MAX_BYTES) return { ok: false, error: "size" };

  const bucket = env.SUPABASE_PHOTO_BUCKET;
  const base = env.SUPABASE_URL!.replace(/\/$/, "");
  const path = `${userId}/${randomUUID()}.${ext}`;

  let res: Response;
  try {
    res = await fetch(`${base}/storage/v1/object/${bucket}/${path}`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        "content-type": file.type,
        "cache-control": "public, max-age=31536000",
      },
      body: file.bytes,
    });
  } catch (err) {
    console.error("[storage] upload réseau échoué", err);
    return { ok: false, error: "upload" };
  }
  if (!res.ok) {
    console.error(
      "[storage] upload refusé",
      res.status,
      await res.text().catch(() => ""),
    );
    return { ok: false, error: "upload" };
  }
  return { ok: true, url: `${base}/storage/v1/object/public/${bucket}/${path}` };
}
