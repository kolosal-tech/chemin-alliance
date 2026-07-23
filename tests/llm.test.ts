import { describe, it, expect, afterEach, vi } from "vitest";
import { redactPII } from "@/lib/llm/redaction";
import { resolveModels } from "@/lib/llm/matrix";

describe("redactPII - purge des coordonnées avant envoi LLM tiers", () => {
  it("masque email, téléphone, lien et pseudo", () => {
    const r = redactPII(
      "Écris-moi à jean.dupont@mail.com ou au +225 07 12 34 56 78, insta @jean_d, https://t.me/jean",
    );
    expect(r.text).not.toMatch(/jean\.dupont@mail\.com/);
    expect(r.text).not.toMatch(/07 12 34 56 78/);
    expect(r.text).not.toMatch(/t\.me\/jean/);
    expect(r.text).toMatch(/\[EMAIL\]/);
    expect(r.text).toMatch(/\[TEL\]/);
    expect(r.text).toMatch(/\[LIEN\]/);
    expect(r.text).toMatch(/\[PSEUDO\]/);
    expect(r.count).toBeGreaterThanOrEqual(4);
  });

  it("ne touche PAS au contenu spirituel/culturel (versets, paroisse, ethnie)", () => {
    const src =
      "Discernement selon Jean 3.16 ; ma paroisse à Abidjan, ethnie Akan, le pasteur conseille la patience.";
    const r = redactPII(src);
    expect(r.text).toBe(src);
    expect(r.count).toBe(0);
  });

  it("ne masque PAS les références bibliques avec chapitre:verset(s)", () => {
    const src = "Lisons 1 Corinthiens 13.4-7 et Matthieu 6.9-13 ce soir.";
    const r = redactPII(src);
    expect(r.text).toBe(src);
    expect(r.count).toBe(0);
  });

  it("reconnait un numéro international avec préfixe + et espaces réguliers", () => {
    const r = redactPII("Joignable au +1 415 555 2671 après 18h.");
    expect(r.text).toMatch(/\[TEL\]/);
    expect(r.text).not.toMatch(/415 555 2671/);
  });

  it("reconnait un numéro français à 10 chiffres par groupes de 2", () => {
    const r = redactPII("appelle-moi au 06 12 12 12 12 pour discuter");
    expect(r.text).toMatch(/\[TEL\]/);
    expect(r.text).not.toMatch(/06 12 12 12 12/);
  });
});

describe("matrix - résolution des modèles par étape × palier", () => {
  it("termine toujours par le modèle éprouvé (résilience)", () => {
    const std = resolveModels("dialogue", "standard");
    expect(std.length).toBeGreaterThanOrEqual(1);
    // standard = uniquement le modèle éprouvé (comportement actuel préservé)
    expect(std[std.length - 1]).toBeTruthy();
  });

  it("premium ajoute un modèle plus fin avant le repli", () => {
    const prem = resolveModels("dialogue", "premium");
    expect(prem.length).toBeGreaterThanOrEqual(2);
  });

  it("sécurité a toujours au moins un modèle (jamais derrière un paywall)", () => {
    expect(resolveModels("safety", "standard").length).toBeGreaterThanOrEqual(
      1,
    );
  });
});

describe("matrix - validation Zod de LLM_MATRIX_JSON", () => {
  const ORIGINAL_ENV = process.env.LLM_MATRIX_JSON;

  afterEach(() => {
    if (ORIGINAL_ENV === undefined) {
      delete process.env.LLM_MATRIX_JSON;
    } else {
      process.env.LLM_MATRIX_JSON = ORIGINAL_ENV;
    }
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("JSON invalide -> log d'erreur explicite et repli sur la matrice par défaut", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.resetModules();
    process.env.LLM_MATRIX_JSON = "{ceci n'est pas du json";
    const { resolveModels: resolveModelsFresh } =
      await import("@/lib/llm/matrix");
    const models = resolveModelsFresh("dialogue", "standard");
    expect(models.length).toBeGreaterThanOrEqual(1);
    expect(errSpy).toHaveBeenCalled();
  });

  it("forme invalide (étape inconnue, valeur non-tableau) -> log d'erreur et repli", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.resetModules();
    process.env.LLM_MATRIX_JSON = JSON.stringify({
      etape_inconnue: { standard: ["x/y"] },
    });
    const { resolveModels: resolveModelsFresh } =
      await import("@/lib/llm/matrix");
    const models = resolveModelsFresh("dialogue", "standard");
    expect(models.length).toBeGreaterThanOrEqual(1);
    expect(errSpy).toHaveBeenCalled();
  });

  it("forme valide (surcharge partielle) -> appliquée sans log d'erreur", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.resetModules();
    process.env.LLM_MATRIX_JSON = JSON.stringify({
      dialogue: { standard: ["custom/model-x"] },
    });
    const { resolveModels: resolveModelsFresh } =
      await import("@/lib/llm/matrix");
    const models = resolveModelsFresh("dialogue", "standard");
    expect(models[0]).toBe("custom/model-x");
    expect(resolveModelsFresh("dialogue", "premium")[0]).toBe(
      "anthropic/claude-sonnet-4.6",
    );
    expect(resolveModelsFresh("safety", "standard")[0]).toBe(
      "deepseek/deepseek-chat-v3.1",
    );
    expect(errSpy).not.toHaveBeenCalled();
  });
});
