import "server-only";
import { encode } from "blurhash";
import sharp from "sharp";

/**
 * Pipeline photo sécurisé - palier « avant révélation ».
 *
 * BlurHash : empreinte floue (DCT 4×4, ~30 caractères) d'une photo. Calculée
 * UNE fois à l'upload, stockée en base (`User.photoBlurhash`), elle peut être
 * envoyée à n'importe qui - même hors match - sans fuiter d'octets
 * exploitables : on ne reconstitue pas un visage depuis 16 coefficients.
 * C'est le SEUL rendu de la photo d'autrui tant qu'aucun match n'existe.
 */
export async function encodeBlurhash(
  bytes: ArrayBuffer | Buffer,
): Promise<string | null> {
  try {
    const input = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
    const { data, info } = await sharp(input)
      .raw()
      .ensureAlpha()
      .resize(64, 64, { fit: "inside" })
      .toBuffer({ resolveWithObject: true });
    return encode(new Uint8ClampedArray(data), info.width, info.height, 4, 4);
  } catch (err) {
    console.error("[blurhash] encode échoué", err);
    return null;
  }
}

/**
 * Pipeline photo sécurisé - palier intermédiaire « au match ».
 *
 * Variante moyennement floutée : octets RÉELS mais downscale + flou serveur
 * fort (sigma 16) → le visage n'est pas reconstituable, l'ambiance l'est. À ne
 * JAMAIS servir en clair : uniquement via le proxy autorisé, pour un viewer
 * matché dont le stade est < DISCERNMENT. Format 4:5 (ratio carte), JPEG
 * compact. Stockée à côté de l'original (`<uuid>.blur.jpg`).
 */
export async function blurredVariant(
  bytes: ArrayBuffer | Buffer,
): Promise<Buffer | null> {
  try {
    const input = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
    return await sharp(input)
      .resize(360, 450, { fit: "cover" })
      .blur(16)
      .jpeg({ quality: 62 })
      .toBuffer();
  } catch (err) {
    console.error("[blurhash] variante floutée échouée", err);
    return null;
  }
}
