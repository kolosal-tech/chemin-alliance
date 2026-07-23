import sharp from "sharp";

export const MAX_PROFILE_PHOTO_BYTES = 5 * 1024 * 1024;
export const MAX_PROFILE_PHOTO_REQUEST_BYTES =
  MAX_PROFILE_PHOTO_BYTES + 128 * 1024;

const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function isAcceptedProfilePhotoType(type: string): boolean {
  return ACCEPTED_IMAGE_TYPES.has(type.toLowerCase());
}

/**
 * Décode puis réencode toute photo en JPEG sûr.
 *
 * Le décodage réel empêche de faire confiance au seul Content-Type, la limite
 * de pixels bloque les bombes de décompression, et la réécriture supprime EXIF,
 * GPS, profils annexes et éventuelles charges ajoutées après l'image.
 */
export async function normalizeProfilePhoto(
  bytes: ArrayBuffer,
): Promise<Buffer | null> {
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_PROFILE_PHOTO_BYTES) {
    return null;
  }

  try {
    return await sharp(Buffer.from(bytes), {
      failOn: "warning",
      limitInputPixels: 20_000_000,
      sequentialRead: true,
    })
      .rotate()
      .resize({
        width: 2_000,
        height: 2_000,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 88, mozjpeg: true })
      .toBuffer();
  } catch {
    return null;
  }
}
