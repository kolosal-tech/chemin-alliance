import { describe, expect, it } from "vitest";
import { fallbackPortrait, INTERVIEW_QUESTIONS } from "@/lib/agents/preparation";
import { analyzeRisk } from "@/lib/agents/watchman";
import { uncoveredThemes } from "@/lib/agents/facilitator";
import { buildReviewData } from "@/lib/agents/stage-review";
import { silenceDetected } from "@/lib/agents/exit-helper";
import { deterministicSummary } from "@/lib/agents/coach-copilot";
import { REBUILDING_STEPS } from "@/lib/agents/rebuilding";

describe("Compagnon de Préparation — fallback", () => {
  const answers = (overrides: Record<string, string> = {}) =>
    INTERVIEW_QUESTIONS.map((q) => ({
      id: q.id,
      dimension: q.dimension,
      answer:
        overrides[q.id] ??
        "Réponse posée et détaillée qui décrit une situation stable, une communauté présente et un projet réfléchi depuis longtemps.",
    }));

  it("réponses solides -> matching_ready, jamais de score chiffré", () => {
    const p = fallbackPortrait(answers());
    expect(p.overall).toBe("matching_ready");
    expect(JSON.stringify(p)).not.toMatch(/\d+\s*\/\s*\d+|%/);
  });

  it("deuil récent -> dimension accompany + growth_path (jamais un rejet)", () => {
    const p = fallbackPortrait(
      answers({ prep_season: "Je suis veuve, le deuil est encore là, c'était il y a quelques mois." }),
    );
    expect(p.dimensions.emotionalStability.status).toBe("accompany");
    expect(p.overall).toBe("growth_path");
  });

  it("détresse -> human_support (priorité absolue, sans LLM)", () => {
    const p = fallbackPortrait(answers({ prep_season: "je n'en peux plus, détresse totale" }));
    expect(p.overall).toBe("human_support");
  });

  it("les 5 questions existent dans les 4 langues", () => {
    for (const q of INTERVIEW_QUESTIONS) {
      expect(q.text.fr && q.text.en && q.text.es && q.text.pt).toBeTruthy();
    }
  });
});

describe("Veilleur — signaux de risque", () => {
  it("détecte une demande d'argent", () => {
    const r = analyzeRisk("J'ai une urgence financière, envoie-moi 200 euros par Western Union");
    expect(r.flagged).toBe(true);
    expect(r.signals).toContain("money_request");
  });
  it("détecte la manipulation spirituelle", () => {
    const r = analyzeRisk("Dieu m'a révélé que tu es ma femme selon Dieu");
    expect(r.signals).toContain("spiritual_manipulation");
  });
  it("détecte la pression au mariage", () => {
    expect(analyzeRisk("Il faut qu'on se marie vite, tu n'as pas le choix").signals).toContain("marriage_pressure");
  });
  it("ne flagge pas un message ordinaire sur la foi", () => {
    expect(analyzeRisk("Dieu est bon, j'ai beaucoup prié cette semaine pour ma famille.").flagged).toBe(false);
  });
});

describe("Facilitateur — thèmes non couverts", () => {
  it("liste les thèmes jamais abordés jusqu'à l'étape atteinte", () => {
    const { themes, suggestions } = uncoveredThemes(
      "christian_evangelical_default",
      "DIALOGUE",
      ["disc_motivation", "disc_faith_daily", "disc_family_vision", "dial_church"],
    );
    expect(themes).toContain("finances");
    expect(themes).not.toContain("church");
    expect(suggestions.length).toBeGreaterThan(0);
  });
  it("match clôturé -> rien", () => {
    expect(uncoveredThemes("christian_evangelical_default", "CLOSED", []).themes).toEqual([]);
  });
});

describe("Bilan d'étape — données privées", () => {
  it("sépare thèmes partagés / ouverts sans exposer les réponses de l'autre", () => {
    const mine = [
      { questionId: "q1", answer: "ma réponse", userId: "me" },
      { questionId: "q2", answer: "autre réponse", userId: "me" },
    ] as never[];
    const data = buildReviewData(mine, ["q1", "q3"], { q1: "foi", q2: "finances", q3: "famille" });
    expect(data.alignedThemes).toEqual(["foi"]);
    expect(data.openThemes.sort()).toEqual(["famille", "finances"]);
    expect(JSON.stringify(data)).not.toContain("q3:");
  });
});

describe("Sortie Digne — détection de silence", () => {
  const d = (days: number) => new Date(Date.now() - days * 86_400_000);
  it("silence de 8 jours après message de l'autre -> détecté", () => {
    expect(silenceDetected(d(8), d(12))).toBe(true);
  });
  it("j'ai répondu après -> pas de silence", () => {
    expect(silenceDetected(d(8), d(2))).toBe(false);
  });
  it("moins de 7 jours -> pas encore", () => {
    expect(silenceDetected(d(3), null)).toBe(false);
  });
});

describe("Copilote Coach + Reconstruction", () => {
  it("résumé déterministe sans contenu de messages", () => {
    const s = deterministicSummary(
      { stage: "DISCERNMENT", sinceDays: 12, coveredThemes: ["foi"], openThemes: ["finances"], compatibility: [{ key: "faith", status: "aligned" }] },
      "fr",
    );
    expect(s).toContain("DISCERNMENT");
    expect(s).toContain("finances");
  });
  it("parcours de reconstruction en 4 pas et 4 langues", () => {
    for (const loc of ["fr", "en", "es", "pt"] as const) {
      expect(REBUILDING_STEPS[loc]).toHaveLength(4);
    }
  });
});
