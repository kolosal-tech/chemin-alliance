import { describe, it, expect, vi, beforeEach } from "vitest";
import type { GameRound, GameRoundAnswer } from "@prisma/client";

// ── Mocks : la DB et le LLM sont remplacés (test unitaire, aucune I/O réelle).
// vi.hoisted : les objets sont créés AVANT le hoisting de vi.mock, donc les
// factories peuvent y référer sans "Cannot access before initialization".
const { db, callLLM } = vi.hoisted(() => ({
  db: {
    gameRound: {
      count: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    gameRoundAnswer: {
      upsert: vi.fn(),
      findMany: vi.fn(),
    },
  },
  callLLM: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ prisma: db }));
vi.mock("@/lib/llm/gateway", () => ({ callLLM }));

import {
  buildRoundView,
  isRevealReady,
  guessMatches,
  submitAnswer,
  createRound,
  type GameSurface,
} from "@/lib/games/engine";
import { encryptField } from "@/lib/security/crypto";

// Helpers de fabrication.
const INITIATOR = "u-init";
const OTHER = "u-other";

const surfaceForInitiator: GameSurface = {
  kind: "match",
  surfaceId: "m1",
  userId: INITIATOR,
  otherUserId: OTHER,
  locale: "fr",
};
const surfaceForOther: GameSurface = {
  kind: "match",
  surfaceId: "m1",
  userId: OTHER,
  otherUserId: INITIATOR,
  locale: "fr",
};

function round(
  mode: "SHARED" | "GUESS",
  answers: Partial<GameRoundAnswer>[],
  status: "OPEN" | "REVEALED" = "OPEN",
): GameRound & { answers: GameRoundAnswer[] } {
  return {
    id: "r1",
    matchId: "m1",
    coupleSpaceId: null,
    mode,
    questionKey: "q1",
    questionText: null,
    initiatorId: INITIATOR,
    status,
    resultMessageId: null,
    createdAt: new Date("2026-01-01"),
    revealedAt: status === "REVEALED" ? new Date("2026-01-02") : null,
    answers: answers.map((a, i) => ({
      id: `a${i}`,
      roundId: "r1",
      userId: a.userId!,
      answerEncrypted: a.answerEncrypted ?? null,
      guessEncrypted: a.guessEncrypted ?? null,
      createdAt: new Date(),
    })),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("guessMatches — verdict simple (insensible casse/espaces)", () => {
  it("rapproche quand seules casse/espaces diffèrent", () => {
    expect(guessMatches("Pizza", "  pizza  ")).toBe(true);
    expect(guessMatches("La  mer", "la mer")).toBe(true);
  });
  it("ne rapproche pas quand le fond diffère", () => {
    expect(guessMatches("Pizza", "Sushi")).toBe(false);
  });
});

describe("isRevealReady — condition de reveal SHARED", () => {
  it("faux tant qu'un seul a répondu", () => {
    const r = round("SHARED", [
      { userId: INITIATOR, answerEncrypted: encryptField("bleu") },
    ]);
    expect(isRevealReady(r, INITIATOR, OTHER)).toBe(false);
  });
  it("vrai quand les DEUX ont une réponse honnête", () => {
    const r = round("SHARED", [
      { userId: INITIATOR, answerEncrypted: encryptField("bleu") },
      { userId: OTHER, answerEncrypted: encryptField("vert") },
    ]);
    expect(isRevealReady(r, INITIATOR, OTHER)).toBe(true);
  });
});

describe("isRevealReady — condition de reveal GUESS", () => {
  it("faux si l'initiateur a répondu mais l'autre n'a pas deviné", () => {
    const r = round("GUESS", [
      { userId: INITIATOR, answerEncrypted: encryptField("bleu") },
    ]);
    expect(isRevealReady(r, INITIATOR, OTHER)).toBe(false);
  });
  it("faux si l'autre a mis une réponse honnête au lieu d'une devinette", () => {
    // GUESS : l'autre DOIT remplir guessEncrypted, pas answerEncrypted.
    const r = round("GUESS", [
      { userId: INITIATOR, answerEncrypted: encryptField("bleu") },
      { userId: OTHER, answerEncrypted: encryptField("bleu") },
    ]);
    expect(isRevealReady(r, INITIATOR, OTHER)).toBe(false);
  });
  it("vrai quand initiateur=answer ET autre=guess", () => {
    const r = round("GUESS", [
      { userId: INITIATOR, answerEncrypted: encryptField("bleu") },
      { userId: OTHER, guessEncrypted: encryptField("bleu") },
    ]);
    expect(isRevealReady(r, INITIATOR, OTHER)).toBe(true);
  });
});

describe("buildRoundView — NON-exposition avant reveal (sécurité)", () => {
  it("OPEN : aucun contenu, seulement booléens iSubmitted/otherSubmitted", () => {
    const r = round("SHARED", [
      { userId: INITIATOR, answerEncrypted: encryptField("secret-init") },
    ]);
    // Vue du point de vue de l'AUTRE joueur (qui n'a pas encore répondu).
    const view = buildRoundView(r, surfaceForOther);
    expect(view.status).toBe("OPEN");
    expect(view.reveal).toBeNull();
    expect(view.iSubmitted).toBe(false); // l'autre n'a pas répondu
    expect(view.otherSubmitted).toBe(true); // l'initiateur a répondu
    // Le contenu chiffré ne doit apparaître nulle part dans la vue sérialisée.
    expect(JSON.stringify(view)).not.toContain("secret-init");
  });

  it("REVEALED : les deux contenus déchiffrés sont exposés aux deux joueurs", () => {
    const r = round(
      "SHARED",
      [
        { userId: INITIATOR, answerEncrypted: encryptField("bleu") },
        { userId: OTHER, answerEncrypted: encryptField("vert") },
      ],
      "REVEALED",
    );
    const view = buildRoundView(r, surfaceForOther);
    expect(view.status).toBe("REVEALED");
    expect(view.reveal?.myAnswer).toBe("vert"); // "moi" = OTHER
    expect(view.reveal?.otherAnswer).toBe("bleu"); // "l'autre" = INITIATOR
  });

  it("REVEALED GUESS : verdict guessClose calculé", () => {
    const r = round(
      "GUESS",
      [
        { userId: INITIATOR, answerEncrypted: encryptField("Pizza") },
        { userId: OTHER, guessEncrypted: encryptField("  pizza ") },
      ],
      "REVEALED",
    );
    const view = buildRoundView(r, surfaceForInitiator);
    expect(view.reveal?.guessClose).toBe(true);
  });
});

describe("submitAnswer — reveal déclenche le message + resultMessageId", () => {
  it("SHARED : la 2e réponse révèle, poste le message et renvoie revealed=true", async () => {
    const open = round("SHARED", [
      { userId: INITIATOR, answerEncrypted: encryptField("bleu") },
    ]);
    db.gameRound.findFirst.mockResolvedValue(open);
    db.gameRoundAnswer.upsert.mockResolvedValue({});
    // Après upsert : les deux ont répondu -> reveal.
    db.gameRoundAnswer.findMany.mockResolvedValue([
      {
        userId: INITIATOR,
        answerEncrypted: encryptField("bleu"),
        guessEncrypted: null,
      },
      {
        userId: OTHER,
        answerEncrypted: encryptField("vert"),
        guessEncrypted: null,
      },
    ]);
    db.gameRound.update.mockResolvedValue({
      ...open,
      status: "REVEALED",
      revealedAt: new Date(),
      resultMessageId: "msg-1",
      answers: [
        {
          id: "a0",
          roundId: "r1",
          userId: INITIATOR,
          answerEncrypted: encryptField("bleu"),
          guessEncrypted: null,
          createdAt: new Date(),
        },
        {
          id: "a1",
          roundId: "r1",
          userId: OTHER,
          answerEncrypted: encryptField("vert"),
          guessEncrypted: null,
          createdAt: new Date(),
        },
      ],
    });

    const postResultMessage = vi.fn().mockResolvedValue("msg-1");
    const res = await submitAnswer(
      surfaceForOther,
      "r1",
      { answer: "vert" },
      postResultMessage,
    );

    expect(res.revealed).toBe(true);
    expect(res.resultMessageId).toBe("msg-1");
    expect(postResultMessage).toHaveBeenCalledTimes(1);
    // Le texte posté est en clair et contient les deux réponses (neutre).
    const posted = postResultMessage.mock.calls[0][0] as string;
    expect(posted).toContain("bleu");
    expect(posted).toContain("vert");
    // La manche est marquée REVEALED avec resultMessageId.
    expect(db.gameRound.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "REVEALED",
          resultMessageId: "msg-1",
        }),
      }),
    );
  });

  it("SHARED : la 1re réponse ne révèle pas et ne poste rien", async () => {
    const open = round("SHARED", []);
    db.gameRound.findFirst.mockResolvedValue(open);
    db.gameRoundAnswer.upsert.mockResolvedValue({});
    db.gameRoundAnswer.findMany.mockResolvedValue([
      {
        userId: INITIATOR,
        answerEncrypted: encryptField("bleu"),
        guessEncrypted: null,
      },
    ]);

    const postResultMessage = vi.fn();
    const res = await submitAnswer(
      surfaceForInitiator,
      "r1",
      { answer: "bleu" },
      postResultMessage,
    );

    expect(res.revealed).toBe(false);
    expect(res.resultMessageId).toBeNull();
    expect(postResultMessage).not.toHaveBeenCalled();
    expect(db.gameRound.update).not.toHaveBeenCalled();
  });

  it("rejette une manche déjà révélée (409)", async () => {
    db.gameRound.findFirst.mockResolvedValue(round("SHARED", [], "REVEALED"));
    await expect(
      submitAnswer(surfaceForInitiator, "r1", { answer: "x" }, vi.fn()),
    ).rejects.toMatchObject({ code: "ALREADY_REVEALED", status: 409 });
  });

  it("GUESS : l'autre DOIT fournir guess (answer seul rejeté)", async () => {
    db.gameRound.findFirst.mockResolvedValue(round("GUESS", []));
    await expect(
      submitAnswer(surfaceForOther, "r1", { answer: "bleu" }, vi.fn()),
    ).rejects.toMatchObject({ code: "GUESS_REQUIRED", status: 400 });
  });
});

describe("createRound — pioche banque puis relance IA quand épuisée", () => {
  it("count < 24 : pioche une questionKey, aucun appel LLM", async () => {
    db.gameRound.count.mockResolvedValue(3);
    db.gameRound.create.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...round("SHARED", []),
        questionKey: data.questionKey,
        questionText: data.questionText ?? null,
        answers: [],
      }),
    );

    const { view } = await createRound(surfaceForInitiator, "SHARED");
    expect(callLLM).not.toHaveBeenCalled();
    expect(view.questionKey).toBe("q4"); // index 3 -> q4
    expect(view.questionText).toBeNull();
  });

  it("count >= 24 : appelle le LLM et stocke questionText", async () => {
    db.gameRound.count.mockResolvedValue(24);
    callLLM.mockResolvedValue("« Quelle chanson te ressemble ? »");
    db.gameRound.create.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...round("SHARED", []),
        questionKey: data.questionKey ?? null,
        questionText: data.questionText,
        answers: [],
      }),
    );

    const { view } = await createRound(surfaceForInitiator, "SHARED");
    expect(callLLM).toHaveBeenCalledTimes(1);
    expect(callLLM).toHaveBeenCalledWith(
      expect.objectContaining({ step: "dialogue", locale: "fr" }),
    );
    expect(view.questionKey).toBeNull();
    // Guillemets nettoyés.
    expect(view.questionText).toBe("Quelle chanson te ressemble ?");
  });

  it("count >= 24 mais LLM échoue : repli déterministe sur la banque", async () => {
    db.gameRound.count.mockResolvedValue(24);
    callLLM.mockResolvedValue(null);
    db.gameRound.create.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...round("SHARED", []),
        questionKey: data.questionKey ?? null,
        questionText: data.questionText ?? null,
        answers: [],
      }),
    );

    const { view } = await createRound(surfaceForInitiator, "SHARED");
    expect(view.questionText).toBeNull();
    expect(view.questionKey).toBe("q1"); // 24 % 24 = 0 -> q1
  });
});
