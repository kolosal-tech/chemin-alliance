import { afterEach, describe, expect, it, vi } from "vitest";

describe("propagation de l'échéance jusqu'à la passerelle LLM", () => {
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
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("aborte fetch et n'entame pas le modèle suivant", async () => {
    vi.useFakeTimers();
    vi.spyOn(console, "log").mockImplementation(() => {});
    process.env.AI_PROVIDER = "openrouter";
    process.env.OPENROUTER_API_KEY = "openrouter-test-key";
    process.env.OPENROUTER_MODEL = "custom-lab/model-fallback";
    process.env.OPENROUTER_ALLOWED_PROVIDERS = "azure";
    process.env.LLM_MATRIX_JSON = JSON.stringify({
      dialogue: {
        standard: ["custom-lab/model-a", "custom-lab/model-b"],
      },
    });
    vi.resetModules();

    const fetchMock = vi.fn(
      async (_url: string, init?: RequestInit): Promise<Response> =>
        new Promise<Response>((_resolve, reject) => {
          const signal = init?.signal;
          if (signal?.aborted) {
            reject(new DOMException("Aborted", "AbortError"));
            return;
          }
          signal?.addEventListener(
            "abort",
            () => reject(new DOMException("Aborted", "AbortError")),
            { once: true },
          );
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { callLLM } = await import("@/lib/llm/gateway");
    const { LlmDeadlineExceededError, withLlmDeadline } =
      await import("@/lib/llm/deadline");
    const result = withLlmDeadline(100, () =>
      callLLM({
        system: "System",
        user: "Question",
        step: "dialogue",
        tier: "standard",
      }),
    );
    const rejection = expect(result).rejects.toBeInstanceOf(
      LlmDeadlineExceededError,
    );

    await vi.advanceTimersByTimeAsync(100);
    await rejection;

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
    const requestBody = JSON.parse(
      String(fetchMock.mock.calls[0]?.[1]?.body),
    ) as { provider: Record<string, unknown> };
    expect(requestBody.provider).toEqual({
      only: ["azure"],
      allow_fallbacks: false,
      data_collection: "deny",
      zdr: true,
    });
  });
});
