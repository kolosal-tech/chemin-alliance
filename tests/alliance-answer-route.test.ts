import { beforeEach, describe, expect, it, vi } from "vitest";
import { openAllianceAnswer } from "@/lib/alliance-answer";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  requireActiveMatchMember: vi.fn(),
  getStageQuestions: vi.fn(),
  upsert: vi.fn(),
}));

vi.mock("@/lib/security/session", () => ({
  requireUser: mocks.requireUser,
}));

vi.mock("@/lib/alliance", () => ({
  requireActiveMatchMember: mocks.requireActiveMatchMember,
}));

vi.mock("@/lib/core-engine", () => ({
  getStageQuestions: mocks.getStageQuestions,
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    allianceAnswer: {
      upsert: mocks.upsert,
    },
  },
}));

import { POST } from "@/app/api/matches/[matchId]/alliance-path/answer/route";

describe("POST /api/matches/:matchId/alliance-path/answer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({
      id: "user-1",
      rulesetId: "ruleset-1",
    });
    mocks.requireActiveMatchMember.mockResolvedValue({
      id: "match-1",
      stage: "DIALOGUE",
    });
    mocks.getStageQuestions.mockReturnValue([{ id: "q1" }]);
    mocks.upsert.mockResolvedValue({});
  });

  it("écrit uniquement le ciphertext et ne renvoie pas le contenu", async () => {
    const plaintext = "Réponse confidentielle de parcours";
    const response = await POST(
      new Request("https://app.test/api/matches/match-1/alliance-path/answer", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ questionId: "q1", answer: plaintext }),
      }),
      { params: Promise.resolve({ matchId: "match-1" }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(mocks.upsert).toHaveBeenCalledOnce();

    const write = mocks.upsert.mock.calls[0][0];
    expect(write.create.answerLegacy).toBe("");
    expect(write.update.answerLegacy).toBe("");
    expect(write.create.answerEncrypted).not.toBe(plaintext);
    expect(JSON.stringify(write)).not.toContain(plaintext);
    expect(
      openAllianceAnswer({
        answerEncrypted: write.create.answerEncrypted,
        answerLegacy: write.create.answerLegacy,
      }),
    ).toBe(plaintext);
  });
});
