import { describe, it, expect, vi, beforeEach } from "vitest";

const callLLM = vi.fn();

vi.mock("@/lib/llm/gateway", () => ({
  callLLM: (...args: unknown[]) => callLLM(...args),
}));

import { generateCompanionReply } from "@/lib/companions/reply";

describe("generateCompanionReply - contrat d'appel à callLLM", () => {
  beforeEach(() => {
    callLLM.mockReset();
  });

  it("transmet system/user/step/maxTokens/locale/history tels quels à callLLM", async () => {
    callLLM.mockResolvedValueOnce("Réponse du compagnon");
    const history = [{ role: "user" as const, content: "Salut" }];

    const result = await generateCompanionReply({
      systemPrompt: "Tu es un compagnon IA bienveillant.",
      locale: "fr",
      userMessage: "Comment ça va ?",
      history,
    });

    expect(result).toBe("Réponse du compagnon");
    expect(callLLM).toHaveBeenCalledTimes(1);
    expect(callLLM).toHaveBeenCalledWith({
      system: "Tu es un compagnon IA bienveillant.",
      user: "Comment ça va ?",
      step: "dialogue",
      maxTokens: 400,
      locale: "fr",
      history,
    });
  });

  it("fonctionne sans historique fourni (history undefined transmis tel quel)", async () => {
    callLLM.mockResolvedValueOnce("ok");

    await generateCompanionReply({
      systemPrompt: "Système",
      locale: "en",
      userMessage: "Hello",
    });

    expect(callLLM).toHaveBeenCalledWith({
      system: "Système",
      user: "Hello",
      step: "dialogue",
      maxTokens: 400,
      locale: "en",
      history: undefined,
    });
  });

  it("propage null si callLLM échoue (repli déterministe côté appelant)", async () => {
    callLLM.mockResolvedValueOnce(null);

    const result = await generateCompanionReply({
      systemPrompt: "Système",
      locale: "es",
      userMessage: "Hola",
    });

    expect(result).toBeNull();
  });
});
