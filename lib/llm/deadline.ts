import { AsyncLocalStorage } from "node:async_hooks";

const abortSignalContext = new AsyncLocalStorage<AbortSignal>();

export class LlmDeadlineExceededError extends Error {
  constructor() {
    super("AI_COACH_PROVIDER_TIMEOUT");
    this.name = "LlmDeadlineExceededError";
  }
}

/** Signal de l'échéance globale de l'appel interactif courant, s'il existe. */
export function currentLlmAbortSignal(): AbortSignal | undefined {
  return abortSignalContext.getStore();
}

/** Refuse immédiatement une opération dont l'échéance globale est consommée. */
export function assertLlmDeadlineActive(): void {
  if (currentLlmAbortSignal()?.aborted) {
    throw new LlmDeadlineExceededError();
  }
}

/**
 * Impose une échéance globale à toute la chaîne de fallback LLM.
 *
 * Le callback n'est pas abandonné avec un simple Promise.race : le signal est
 * propagé jusqu'à fetch et on attend sa terminaison effective avant de rendre
 * la main. Le verrou de consentement ne peut donc pas être libéré pendant
 * qu'un transfert réseau continue en arrière-plan.
 */
export async function withLlmDeadline<T>(
  timeoutMs: number,
  callback: () => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  let expired = false;
  const timer = setTimeout(() => {
    expired = true;
    controller.abort();
  }, timeoutMs);

  try {
    const result = await abortSignalContext.run(controller.signal, callback);
    if (expired) throw new LlmDeadlineExceededError();
    return result;
  } finally {
    clearTimeout(timer);
  }
}
