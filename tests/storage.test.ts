import { describe, it, expect } from "vitest";
import { extractPhotoPath, signedPhotoUrl } from "@/lib/storage";
import {
  isAcceptedProfilePhotoType,
  MAX_PROFILE_PHOTO_BYTES,
  normalizeProfilePhoto,
} from "@/lib/profile-photo";
import sharp from "sharp";

const B = "profile-photos";

describe("extractPhotoPath", () => {
  it("extrait le chemin d'une URL publique", () => {
    expect(
      extractPhotoPath(
        `https://x.supabase.co/storage/v1/object/public/${B}/u1/abc.png`,
        B,
      ),
    ).toBe("u1/abc.png");
  });

  it("extrait le chemin d'une URL signée (sans le token)", () => {
    expect(
      extractPhotoPath(
        `https://x.supabase.co/storage/v1/object/sign/${B}/u1/abc.png?token=zzz`,
        B,
      ),
    ).toBe("u1/abc.png");
  });

  it("accepte un chemin nu (avec ou sans slash initial)", () => {
    expect(extractPhotoPath("u1/abc.png", B)).toBe("u1/abc.png");
    expect(extractPhotoPath("/u1/abc.png", B)).toBe("u1/abc.png");
  });

  it("renvoie null pour une URL externe inattendue", () => {
    expect(extractPhotoPath("https://evil.example/u1/abc.png", B)).toBeNull();
  });
});

describe("signedPhotoUrl - repli sûr sans clés", () => {
  it("renvoie null pour une valeur nulle", async () => {
    expect(await signedPhotoUrl(null)).toBeNull();
  });

  it("renvoie la valeur d'entrée telle quelle quand le stockage est dormant", async () => {
    const url = `https://x.supabase.co/storage/v1/object/public/${B}/u1/abc.png`;
    expect(await signedPhotoUrl(url)).toBe(url);
  });
});

describe("normalisation sécurisée des photos", () => {
  it("rejette les types non autorisés avant décodage", () => {
    expect(isAcceptedProfilePhotoType("image/svg+xml")).toBe(false);
    expect(isAcceptedProfilePhotoType("text/html")).toBe(false);
    expect(isAcceptedProfilePhotoType("image/jpeg")).toBe(true);
  });

  it("rejette un faux fichier image", async () => {
    const bytes = new TextEncoder().encode("<script>alert(1)</script>").buffer;
    expect(await normalizeProfilePhoto(bytes)).toBeNull();
  });

  it("réencode en JPEG sans métadonnées", async () => {
    const source = await sharp({
      create: {
        width: 12,
        height: 8,
        channels: 3,
        background: "#334455",
      },
    })
      .withMetadata({ orientation: 6 })
      .png()
      .toBuffer();
    const input = source.buffer.slice(
      source.byteOffset,
      source.byteOffset + source.byteLength,
    ) as ArrayBuffer;
    const normalized = await normalizeProfilePhoto(input);

    expect(normalized).not.toBeNull();
    const metadata = await sharp(normalized!).metadata();
    expect(metadata.format).toBe("jpeg");
    expect(metadata.width).toBe(8);
    expect(metadata.height).toBe(12);
    expect(metadata.exif).toBeUndefined();
  });

  it("refuse un corps dépassant 5 Mo sans le décoder", async () => {
    const tooLarge = new ArrayBuffer(MAX_PROFILE_PHOTO_BYTES + 1);
    expect(await normalizeProfilePhoto(tooLarge)).toBeNull();
  });
});
