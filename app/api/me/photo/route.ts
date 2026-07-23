import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, withErrors } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";
import { rateLimit, LIMITS } from "@/lib/security/rate-limit";
import {
  blurredVariantPath,
  photoProxyUrl,
  photoUploadEnabled,
  putPhotoObject,
  deleteProfilePhotoObjects,
  uploadProfilePhoto,
} from "@/lib/storage";
import { blurredVariant, encodeBlurhash } from "@/lib/blurhash";
import {
  isAcceptedProfilePhotoType,
  MAX_PROFILE_PHOTO_BYTES,
  MAX_PROFILE_PHOTO_REQUEST_BYTES,
  normalizeProfilePhoto,
} from "@/lib/profile-photo";
import {
  InvalidMultipartError,
  MultipartPayloadTooLargeError,
  readMultipartFormDataLimited,
} from "@/lib/multipart";

// Upload Supabase Storage (fetch + service key) => runtime Node obligatoire.
export const runtime = "nodejs";

export const POST = withErrors(async (req: Request) => {
  const user = await requireUser();
  if (!photoUploadEnabled()) return jsonError(503, "PHOTO_DISABLED");

  const rl = await rateLimit(
    `photo:${user.id}`,
    LIMITS.unread.limit,
    LIMITS.unread.windowMs,
  );
  if (!rl.allowed) return jsonError(429, "RATE_LIMITED");

  let form: FormData;
  try {
    form = await readMultipartFormDataLimited(
      req,
      MAX_PROFILE_PHOTO_REQUEST_BYTES,
    );
  } catch (error) {
    if (error instanceof MultipartPayloadTooLargeError) {
      return jsonError(413, "TOO_LARGE");
    }
    if (error instanceof InvalidMultipartError) {
      return jsonError(400, "INVALID_MULTIPART");
    }
    throw error;
  }
  const file = form.get("photo");
  if (!(file instanceof File)) return jsonError(400, "NO_FILE");
  if (!isAcceptedProfilePhotoType(file.type)) {
    return jsonError(400, "BAD_TYPE");
  }
  if (file.size === 0 || file.size > MAX_PROFILE_PHOTO_BYTES) {
    return jsonError(413, "TOO_LARGE");
  }

  const bytes = await file.arrayBuffer();
  const normalized = await normalizeProfilePhoto(bytes);
  if (!normalized) return jsonError(400, "INVALID_IMAGE");

  const result = await uploadProfilePhoto(user.id, {
    type: "image/jpeg",
    bytes: normalized,
  });
  if (!result.ok) {
    if (result.error === "type") return jsonError(400, "BAD_TYPE");
    if (result.error === "size") return jsonError(413, "TOO_LARGE");
    return jsonError(502, "UPLOAD_FAILED");
  }

  // Pipeline photo sécurisé : empreinte BlurHash (palier pré-révélation, en
  // base) + variante moyennement floutée (palier intermédiaire, stockée à côté
  // de l'original). Best-effort : un échec n'invalide pas l'upload de la photo.
  const blurhash = await encodeBlurhash(normalized);
  const variant = await blurredVariant(normalized);
  if (variant) {
    const vpath = blurredVariantPath(result.url);
    if (vpath) await putPhotoObject(vpath, "image/jpeg", variant);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { photoUrl: result.url, photoBlurhash: blurhash },
  });
  if (user.photoUrl && user.photoUrl !== result.url) {
    // Nettoyage best-effort de l'ancienne version après que la nouvelle est
    // devenue autoritative en base. Un échec ne remet pas une photo valide en
    // erreur, mais reste tracé par le helper Storage.
    await deleteProfilePhotoObjects(user.photoUrl);
  }
  return NextResponse.json({
    ok: true,
    photoUrl: photoProxyUrl(result.url),
  });
});
