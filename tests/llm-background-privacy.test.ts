import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  completeText: vi.fn(),
  callLLM: vi.fn(),
}));

vi.mock("@/lib/agents/llm", () => ({
  completeText: mocks.completeText,
}));

vi.mock("@/lib/llm/gateway", () => ({
  callLLM: mocks.callLLM,
}));

import { localIceBreaker } from "@/lib/agents/ice-breaker";
import { narrateReview } from "@/lib/agents/stage-review";
import { guardianWord } from "@/lib/agents/guardian";
import { draftExitMessage } from "@/lib/agents/exit-helper";
import { consolationWord } from "@/lib/agents/rebuilding";
import {
  deterministicSummary,
  REQUIRED_COACH_CONSENT_SCOPE,
  SCOPED_COACH_CONSENT_SUPPORTED,
} from "@/lib/agents/coach-copilot";

const SECRET = "SECRET_MARKER_7b31_private";

describe("confidentialité des narrations de fond", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("génère l'ice-breaker localement, sans reprendre le seed", () => {
    const first = localIceBreaker("fr", SECRET);
    const second = localIceBreaker("fr", SECRET);

    expect(first).toBe(second);
    expect(first).not.toContain(SECRET);
  });

  it("n'inclut aucun extrait de réponse dans le bilan local", async () => {
    const narrative = await narrateReview(
      {
        alignedThemes: ["foi"],
        openThemes: ["famille"],
        myHighlights: [{ questionId: "q1", excerpt: SECRET }],
      },
      "DIALOGUE",
      "fr",
    );

    expect(narrative).not.toContain(SECRET);
  });

  it("n'inclut aucune note ni mémoire privée dans le mot du Gardien", async () => {
    const word = await guardianWord(
      "MARRIED",
      [{ id: "chk_time_together", value: "no", note: SECRET }],
      "fr",
    );

    expect(word).not.toContain(SECRET);
  });

  it("utilise un modèle de sortie sans recopier la note libre", async () => {
    const draft = await draftExitMessage("other", SECRET, "fr");

    expect(draft).not.toContain(SECRET);
  });

  it("fournit une consolation locale et garde le copilote désactivé", async () => {
    expect(await consolationWord("fr")).toBeTruthy();
    expect(SCOPED_COACH_CONSENT_SUPPORTED).toBe(false);
    expect(REQUIRED_COACH_CONSENT_SCOPE).toEqual({
      relation: "MATCH",
      recipient: "VERIFIED_HUMAN_COACH",
      purpose: "SESSION_PREPARATION",
      version: "coach-sharing-v1",
    });
    expect(
      deterministicSummary(
        {
          stage: "DISCOVERY",
          sinceDays: 1,
          coveredThemes: [],
          openThemes: [],
          compatibility: [],
        },
        "fr",
      ),
    ).toBeTruthy();
  });

  it("n'appelle aucun fournisseur LLM pour ces traitements", () => {
    expect(mocks.completeText).not.toHaveBeenCalled();
    expect(mocks.callLLM).not.toHaveBeenCalled();
  });
});
