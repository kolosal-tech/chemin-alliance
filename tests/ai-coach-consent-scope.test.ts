import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildAiRecipientScope,
  currentAiRecipientScope,
} from "@/lib/llm/scope";

describe("périmètre destinataires du Coach IA", () => {
  it("fingerprinte le fournisseur et chaque modèle sans dépendre de leur ordre", () => {
    const first = buildAiRecipientScope(
      "openrouter",
      ["anthropic/claude-sonnet-4.6", "qwen/qwen3-30b-a3b-instruct-2507"],
      ["anthropic", "together"],
    );
    const reordered = buildAiRecipientScope(
      "openrouter",
      ["qwen/qwen3-30b-a3b-instruct-2507", "anthropic/claude-sonnet-4.6"],
      ["together", "anthropic"],
    );
    const changed = buildAiRecipientScope(
      "openrouter",
      [
        "anthropic/claude-sonnet-4.6",
        "qwen/qwen3-30b-a3b-instruct-2507",
        "google/gemini-2.5-flash",
      ],
      ["anthropic", "together"],
    );

    expect(first.fingerprint).toBe(reordered.fingerprint);
    expect(changed.fingerprint).not.toBe(first.fingerprint);
    expect(first.models).toEqual([
      "anthropic/claude-sonnet-4.6",
      "qwen/qwen3-30b-a3b-instruct-2507",
    ]);
  });

  it("nomme les opérateurs d'inférence configurés, pas les éditeurs", () => {
    const scope = buildAiRecipientScope(
      "openrouter",
      ["custom-lab/model-v2", "meta-llama/llama-4", "qwen/qwen3-30b"],
      ["azure", "deepinfra"],
    );

    expect(scope.summary).toBe("OpenRouter · azure · deepinfra");
    expect(scope.recipients).toEqual([
      "inference-operator:azure",
      "inference-operator:deepinfra",
      "intermediary:openrouter",
    ]);
    expect(scope.routing).toEqual({
      only: ["azure", "deepinfra"],
      allow_fallbacks: false,
      data_collection: "deny",
      zdr: true,
    });
  });

  it("rejette un slug susceptible d'injecter du texte ou un secret", () => {
    expect(() =>
      buildAiRecipientScope(
        "openrouter",
        ["provider/model\nsecret"],
        ["azure"],
      ),
    ).toThrow("INVALID_OPENROUTER_RECIPIENT_SCOPE");
    expect(() =>
      buildAiRecipientScope("openrouter", ["sk-private/model"], ["azure"]),
    ).toThrow("INVALID_OPENROUTER_RECIPIENT_SCOPE");
    expect(() =>
      buildAiRecipientScope("openrouter", ["provider/model"], ["sk-private"]),
    ).toThrow("INVALID_OPENROUTER_PROVIDER_ALLOWLIST");
  });

  it("invalide le fingerprint dès qu'un opérateur d'inférence change", () => {
    const azure = buildAiRecipientScope(
      "openrouter",
      ["openai/gpt-4o-mini"],
      ["azure"],
    );
    const openai = buildAiRecipientScope(
      "openrouter",
      ["openai/gpt-4o-mini"],
      ["openai"],
    );

    expect(azure.fingerprint).not.toBe(openai.fingerprint);
  });

  it("distingue chaque fournisseur direct et le mode local", () => {
    const anthropic = buildAiRecipientScope("anthropic");
    const openai = buildAiRecipientScope("openai");
    const local = buildAiRecipientScope("fallback");

    expect(anthropic.fingerprint).not.toBe(openai.fingerprint);
    expect(local.fingerprint).not.toBe(openai.fingerprint);
    expect(local.summary).toBe("LOCAL_ONLY");
    expect(local.models).toEqual([]);
  });

  it("expose un fingerprint opaque pour la configuration serveur courante", () => {
    const scope = currentAiRecipientScope();

    expect(scope.fingerprint).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(scope.summary).not.toMatch(/API_KEY|sk-/i);
  });
});

describe("périmètre dynamique issu de LLM_MATRIX_JSON", () => {
  const original = {
    AI_PROVIDER: process.env.AI_PROVIDER,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    OPENROUTER_MODEL: process.env.OPENROUTER_MODEL,
    OPENROUTER_ALLOWED_PROVIDERS: process.env.OPENROUTER_ALLOWED_PROVIDERS,
    LLM_MATRIX_JSON: process.env.LLM_MATRIX_JSON,
  };

  afterEach(() => {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    vi.resetModules();
  });

  it("invalide le fingerprint dès qu'un modèle effectif change", async () => {
    process.env.AI_PROVIDER = "openrouter";
    process.env.OPENROUTER_API_KEY = "openrouter-test-key";
    process.env.OPENROUTER_MODEL = "anthropic/claude-haiku-4.5";
    process.env.OPENROUTER_ALLOWED_PROVIDERS = "anthropic";
    process.env.LLM_MATRIX_JSON = JSON.stringify({
      dialogue: { standard: ["custom-lab/model-a"] },
    });
    vi.resetModules();
    const firstModule = await import("@/lib/llm/scope");
    const first = firstModule.currentAiRecipientScope();

    process.env.LLM_MATRIX_JSON = JSON.stringify({
      dialogue: { standard: ["custom-lab/model-b"] },
    });
    vi.resetModules();
    const secondModule = await import("@/lib/llm/scope");
    const second = secondModule.currentAiRecipientScope();

    expect(first.models).toContain("custom-lab/model-a");
    expect(second.models).toContain("custom-lab/model-b");
    expect(second.fingerprint).not.toBe(first.fingerprint);
  });
});
