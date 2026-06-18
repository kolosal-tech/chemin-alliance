import { describe, it, expect } from "vitest";
import { extractPhotoPath, signedPhotoUrl } from "@/lib/storage";

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

describe("signedPhotoUrl — repli sûr sans clés", () => {
  it("renvoie null pour une valeur nulle", async () => {
    expect(await signedPhotoUrl(null)).toBeNull();
  });

  it("renvoie la valeur d'entrée telle quelle quand le stockage est dormant", async () => {
    const url = `https://x.supabase.co/storage/v1/object/public/${B}/u1/abc.png`;
    expect(await signedPhotoUrl(url)).toBe(url);
  });
});
