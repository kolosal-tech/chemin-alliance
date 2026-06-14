import { describe, it, expect, afterEach } from "vitest";
import {
  recordLlmCall,
  setLlmTelemetrySink,
  type LlmTelemetryEvent,
} from "@/lib/llm/telemetry";

const sample: LlmTelemetryEvent = {
  step: "dialogue",
  tier: "standard",
  provider: "openrouter",
  model: "google/gemini-2.5-flash",
  ok: true,
  fallback: false,
  latencyMs: 412,
  attempts: 1,
  promptTokens: 120,
  completionTokens: 64,
  redactedPii: 2,
};

describe("télémétrie LLM", () => {
  afterEach(() => {
    // Restaure le puits par défaut (log stdout) entre les tests.
    setLlmTelemetrySink((e) => {
      void e;
    });
  });

  it("transmet l'événement au puits et le renvoie", () => {
    const seen: LlmTelemetryEvent[] = [];
    setLlmTelemetrySink((e) => seen.push(e));
    const ret = recordLlmCall(sample);
    expect(seen).toHaveLength(1);
    expect(seen[0]).toEqual(sample);
    expect(ret).toEqual(sample);
  });

  it("n'expose aucune donnée perso (clés métadonnées uniquement)", () => {
    const keys = Object.keys(sample).sort();
    expect(keys).toEqual(
      [
        "attempts",
        "completionTokens",
        "fallback",
        "latencyMs",
        "model",
        "ok",
        "promptTokens",
        "provider",
        "redactedPii",
        "step",
        "tier",
      ].sort(),
    );
    // pas de champ contenu / userId / texte
    expect(keys).not.toContain("userId");
    expect(keys).not.toContain("user");
    expect(keys).not.toContain("content");
    expect(keys).not.toContain("prompt");
  });

  it("un puits qui lève ne fait jamais échouer l'appel", () => {
    setLlmTelemetrySink(() => {
      throw new Error("sink down");
    });
    expect(() => recordLlmCall(sample)).not.toThrow();
  });
});
