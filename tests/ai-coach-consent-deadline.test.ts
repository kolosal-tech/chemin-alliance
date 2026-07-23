import { afterEach, describe, expect, it, vi } from "vitest";
import {
  assertLlmDeadlineActive,
  currentLlmAbortSignal,
  LlmDeadlineExceededError,
  withLlmDeadline,
} from "@/lib/llm/deadline";

describe("échéance globale fournisseur", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("attend que le callback observe l'abort avant de rendre la main", async () => {
    vi.useFakeTimers();
    let abortObserved = false;

    const result = withLlmDeadline(100, async () => {
      const signal = currentLlmAbortSignal();
      expect(signal).toBeDefined();
      await new Promise<void>((resolve) => {
        signal!.addEventListener(
          "abort",
          () => {
            abortObserved = true;
            resolve();
          },
          { once: true },
        );
      });
      return "network-stopped";
    });
    const rejection = expect(result).rejects.toBeInstanceOf(
      LlmDeadlineExceededError,
    );

    await vi.advanceTimersByTimeAsync(100);

    await rejection;
    expect(abortObserved).toBe(true);
  });

  it("interdit une admission qui acquiert son verrou après l'échéance", async () => {
    vi.useFakeTimers();
    const reachedAfterDeadline = withLlmDeadline(100, async () => {
      await new Promise<void>((resolve) => setTimeout(resolve, 100));
      assertLlmDeadlineActive();
      return "forbidden";
    });
    const rejection = expect(reachedAfterDeadline).rejects.toBeInstanceOf(
      LlmDeadlineExceededError,
    );

    await vi.advanceTimersByTimeAsync(100);
    await rejection;
  });
});
