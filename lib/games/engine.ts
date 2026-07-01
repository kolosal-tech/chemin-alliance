import type { GameMode, GameRound, GameRoundAnswer } from "@prisma/client";
import { prisma } from "@/lib/db";
import { encryptField, decryptOptional } from "@/lib/security/crypto";
import { callLLM } from "@/lib/llm/gateway";
import type { Locale } from "@/lib/core-engine";
import { QUESTION_COUNT, questionKeyForIndex } from "@/lib/games/questions";

/**
 * Moteur PARTAGÉ du jeu de couple/match (construction C, hybride, SANS FIN).
 *
 * Ce module concentre TOUTE la logique de manche, indépendamment de la surface
 * (Match humain-humain OU Espace Couple). Il ne connaît ni la table des
 * messages ni l'i18n d'affichage : il reçoit un descripteur de surface et,
 * pour le reveal, un callback `postResultMessage(text) -> id` fourni par
 * l'appelant (route match => prisma.message.create kind SYSTEM ;
 * route couple => prisma.coupleMessage.create).
 *
 * Garanties de sécurité (cf. CONTRAT DU JEU) :
 *  - answerEncrypted / guessEncrypted d'un joueur ne sont JAMAIS déchiffrés ni
 *    exposés à l'autre joueur tant que status != REVEALED. Le moteur ne fournit
 *    que des booléens "qui a soumis" avant le reveal (buildRoundView).
 *  - Le contenu (réponse, devinette) est chiffré au repos via encryptField.
 */

// ── Descripteur de surface ───────────────────────────────────────────────────
// La surface identifie où vit la manche et qui sont les deux joueurs. `userId`
// est le joueur COURANT (celui qui agit) ; `otherUserId` est son partenaire.
export type GameSurface = {
  kind: "match" | "couple";
  surfaceId: string;
  userId: string;
  otherUserId: string;
  /** Locale du joueur courant (génération IA + résultat neutre). */
  locale: Locale;
};

/** Clause Prisma ciblant la surface (match XOR couple). */
function surfaceWhere(surface: GameSurface) {
  return surface.kind === "match"
    ? { matchId: surface.surfaceId }
    : { coupleSpaceId: surface.surfaceId };
}

// ── Vue filtrée-sécurisée d'une manche ───────────────────────────────────────
// Avant le reveal : uniquement des booléens (aucun contenu). Après le reveal :
// contenus déchiffrés (les deux joueurs peuvent tout voir).
export type RevealView = {
  mode: GameMode;
  // Réponse honnête de chaque joueur (déchiffrée), présente au reveal.
  myAnswer: string | null;
  otherAnswer: string | null;
  // Mode GUESS : la devinette de chaque joueur (déchiffrée).
  myGuess: string | null;
  otherGuess: string | null;
  // Mode GUESS : verdict simple (les deux sont-ils "proches" ?).
  guessClose: boolean | null;
};

export type RoundView = {
  id: string;
  mode: GameMode;
  questionKey: string | null;
  questionText: string | null;
  status: "OPEN" | "REVEALED";
  initiatorId: string;
  createdAt: Date;
  revealedAt: Date | null;
  iSubmitted: boolean;
  otherSubmitted: boolean;
  reveal: RevealView | null;
};

type RoundWithAnswers = GameRound & { answers: GameRoundAnswer[] };

/**
 * Un joueur a-t-il "soumis" pour cette manche ? La définition dépend du mode et
 * du rôle : en SHARED chacun doit fournir une réponse honnête ; en GUESS
 * l'initiateur fournit une réponse honnête, l'AUTRE fournit une devinette.
 */
function hasSubmitted(round: RoundWithAnswers, playerId: string): boolean {
  const row = round.answers.find((a) => a.userId === playerId);
  if (!row) return false;
  if (round.mode === "SHARED") return row.answerEncrypted != null;
  // GUESS : l'initiateur soumet une réponse honnête, l'autre une devinette.
  return playerId === round.initiatorId
    ? row.answerEncrypted != null
    : row.guessEncrypted != null;
}

/** Condition de reveal : les DEUX joueurs ont soumis (selon mode+rôle). */
export function isRevealReady(
  round: RoundWithAnswers,
  initiatorId: string,
  otherId: string,
): boolean {
  return hasSubmitted(round, initiatorId) && hasSubmitted(round, otherId);
}

/** Verdict GUESS : la devinette rejoint-elle la réponse honnête ? */
export function guessMatches(honest: string, guess: string): boolean {
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
  return norm(honest) === norm(guess);
}

/**
 * Construit la vue d'une manche pour le joueur courant. Filtre-sécurisé :
 * avant REVEALED, `reveal` est null et aucun contenu n'est déchiffré.
 */
export function buildRoundView(
  round: RoundWithAnswers,
  surface: GameSurface,
): RoundView {
  const me = surface.userId;
  const other = surface.otherUserId;
  const base = {
    id: round.id,
    mode: round.mode,
    questionKey: round.questionKey,
    questionText: round.questionText,
    initiatorId: round.initiatorId,
    createdAt: round.createdAt,
    revealedAt: round.revealedAt,
    iSubmitted: hasSubmitted(round, me),
    otherSubmitted: hasSubmitted(round, other),
  };

  if (round.status !== "REVEALED") {
    // SÉCURITÉ : avant le reveal, aucun contenu n'est exposé.
    return { ...base, status: "OPEN", reveal: null };
  }

  const initiatorRow = round.answers.find(
    (a) => a.userId === round.initiatorId,
  );
  const otherRow = round.answers.find((a) => a.userId !== round.initiatorId);
  const myRow = round.answers.find((a) => a.userId === me);
  const otherPlayerRow = round.answers.find((a) => a.userId === other);

  let guessClose: boolean | null = null;
  if (round.mode === "GUESS") {
    const honest = decryptOptional(initiatorRow?.answerEncrypted);
    const guess = decryptOptional(otherRow?.guessEncrypted);
    guessClose =
      honest != null && guess != null ? guessMatches(honest, guess) : null;
  }

  return {
    ...base,
    status: "REVEALED",
    reveal: {
      mode: round.mode,
      myAnswer: decryptOptional(myRow?.answerEncrypted),
      otherAnswer: decryptOptional(otherPlayerRow?.answerEncrypted),
      myGuess: decryptOptional(myRow?.guessEncrypted),
      otherGuess: decryptOptional(otherPlayerRow?.guessEncrypted),
      guessClose,
    },
  };
}

// ── Création d'une manche ────────────────────────────────────────────────────
const AI_QUESTION_MAX_TOKENS = 80;

/**
 * Prompt de génération d'une question inédite quand la banque est épuisée.
 * Ton du CONTRAT : bienveillant, court, pour se découvrir/se retrouver.
 */
function aiQuestionPrompt(locale: Locale): { system: string; user: string } {
  const system: Record<Locale, string> = {
    fr: "Tu proposes UNE question courte, chaleureuse et ouverte pour aider deux personnes d'un couple (ou en chemin vers l'engagement) à mieux se découvrir ou se retrouver. Pas de sujet intime déplacé, rien de blessant. Réponds UNIQUEMENT par la question, sans guillemets ni numéro.",
    en: "Propose ONE short, warm, open question to help two people in a couple (or on the path to commitment) better discover or reconnect with each other. Nothing intrusive or hurtful. Reply ONLY with the question, no quotes or numbering.",
    es: "Propón UNA pregunta corta, cálida y abierta para ayudar a dos personas de una pareja (o en camino hacia el compromiso) a conocerse o reencontrarse mejor. Nada intrusivo ni hiriente. Responde SOLO con la pregunta, sin comillas ni numeración.",
    pt: "Propõe UMA pergunta curta, calorosa e aberta para ajudar duas pessoas de um casal (ou a caminho do compromisso) a conhecerem-se ou reencontrarem-se melhor. Nada intrusivo nem magoante. Responde APENAS com a pergunta, sem aspas nem numeração.",
  };
  const user: Record<Locale, string> = {
    fr: "Propose une nouvelle question, différente des classiques sur les repas d'enfance, les rêves ou les voyages.",
    en: "Propose a new question, different from the usual ones about childhood meals, dreams or travel.",
    es: "Propón una nueva pregunta, diferente de las típicas sobre comidas de la infancia, sueños o viajes.",
    pt: "Propõe uma nova pergunta, diferente das típicas sobre refeições de infância, sonhos ou viagens.",
  };
  return { system: system[locale], user: user[locale] };
}

export type CreatedRound = {
  round: RoundWithAnswers;
  view: RoundView;
};

/**
 * Crée la manche SUIVANTE pour cette surface (SANS FIN). Le curseur est le
 * nombre de manches déjà créées : `questionKeyForIndex(count)` pioche la
 * prochaine question de la banque. Quand toute la banque a été parcourue au
 * moins une fois (count >= QUESTION_COUNT), on génère une question inédite via
 * le LLM (stockée dans questionText). Si l'IA échoue, repli déterministe sur la
 * banque (jamais de manche vide).
 */
export async function createRound(
  surface: GameSurface,
  mode: GameMode,
): Promise<CreatedRound> {
  const where = surfaceWhere(surface);
  const count = await prisma.gameRound.count({ where });

  let questionKey: string | null = null;
  let questionText: string | null = null;

  if (count < QUESTION_COUNT) {
    questionKey = questionKeyForIndex(count);
  } else {
    // Banque épuisée : relance IA (rate-limitée en amont par la route).
    const { system, user } = aiQuestionPrompt(surface.locale);
    const generated = await callLLM({
      system,
      user,
      step: "dialogue",
      locale: surface.locale,
      maxTokens: AI_QUESTION_MAX_TOKENS,
    });
    const cleaned = generated
      ?.trim()
      .replace(/^["'«»]+|["'«»]+$/g, "")
      .trim();
    if (cleaned) {
      questionText = cleaned;
    } else {
      // Repli déterministe : jamais de manche sans question.
      questionKey = questionKeyForIndex(count);
    }
  }

  const round = await prisma.gameRound.create({
    data: {
      ...where,
      mode,
      questionKey,
      questionText,
      initiatorId: surface.userId,
    },
    include: { answers: true },
  });

  return { round, view: buildRoundView(round, surface) };
}

// ── Soumission d'une réponse / devinette ─────────────────────────────────────
export class GameValidationError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string) {
    super(code);
    this.status = status;
    this.code = code;
    this.name = "GameValidationError";
  }
}

/**
 * Valide le couple (mode, rôle) -> champ attendu, et renvoie la donnée chiffrée
 * à écrire. Lève GameValidationError si l'entrée est incohérente.
 *
 * SHARED : chaque joueur fournit `answer` (réponse honnête).
 * GUESS  : l'initiateur fournit `answer` ; l'AUTRE fournit `guess`.
 */
function resolveSubmission(
  round: RoundWithAnswers,
  playerId: string,
  input: { answer?: string; guess?: string },
): { answerEncrypted?: string; guessEncrypted?: string } {
  const isInitiator = playerId === round.initiatorId;
  const answer = input.answer?.trim();
  const guess = input.guess?.trim();

  if (round.mode === "SHARED") {
    if (!answer) throw new GameValidationError(400, "ANSWER_REQUIRED");
    return { answerEncrypted: encryptField(answer) };
  }
  // GUESS
  if (isInitiator) {
    if (!answer) throw new GameValidationError(400, "ANSWER_REQUIRED");
    return { answerEncrypted: encryptField(answer) };
  }
  if (!guess) throw new GameValidationError(400, "GUESS_REQUIRED");
  return { guessEncrypted: encryptField(guess) };
}

/**
 * Texte NEUTRE du message de résultat posté au reveal. Chiffré par l'appelant
 * via le callback. Résolu dans la locale du joueur qui déclenche le reveal
 * (choix pragmatique : le message est stocké chiffré au repos et affiché tel
 * quel ; on ne peut pas le re-résoudre par lecteur côté fil existant).
 */
function resultMessageText(
  round: RoundWithAnswers,
  surface: GameSurface,
): string {
  const L = surface.locale;
  const t: Record<
    Locale,
    { game: string; you: string; other: string; close: string; diff: string }
  > = {
    fr: {
      game: "Jeu des questions",
      you: "Toi",
      other: "L'autre",
      close: "Vous êtes proches !",
      diff: "À rapprocher.",
    },
    en: {
      game: "Question game",
      you: "You",
      other: "The other",
      close: "You're a close match!",
      diff: "Worth talking about.",
    },
    es: {
      game: "Juego de preguntas",
      you: "Tú",
      other: "El otro",
      close: "¡Están cerca!",
      diff: "Vale la pena hablarlo.",
    },
    pt: {
      game: "Jogo de perguntas",
      you: "Tu",
      other: "O outro",
      close: "Estão próximos!",
      diff: "Vale a pena falar sobre isso.",
    },
  };
  const w = t[L];
  const initiatorRow = round.answers.find(
    (a) => a.userId === round.initiatorId,
  );
  const otherRow = round.answers.find((a) => a.userId !== round.initiatorId);

  if (round.mode === "SHARED") {
    const a = decryptOptional(initiatorRow?.answerEncrypted) ?? "";
    const b = decryptOptional(otherRow?.answerEncrypted) ?? "";
    return `${w.game} · ${w.you}: ${a} · ${w.other}: ${b}`;
  }
  // GUESS
  const honest = decryptOptional(initiatorRow?.answerEncrypted) ?? "";
  const guess = decryptOptional(otherRow?.guessEncrypted) ?? "";
  const verdict = guessMatches(honest, guess) ? w.close : w.diff;
  return `${w.game} · ${honest} / ${guess} · ${verdict}`;
}

export type SubmitResult = {
  view: RoundView;
  /** true si CETTE soumission a déclenché le reveal. */
  revealed: boolean;
  /** id du message de résultat posté (si revealed). */
  resultMessageId: string | null;
};

/**
 * Enregistre la réponse/devinette du joueur courant pour une manche, puis
 * teste la condition de reveal. Si atteinte : marque REVEALED, poste le message
 * de résultat via le callback fourni, et stocke resultMessageId.
 *
 * `postResultMessage` reçoit le texte NEUTRE (clair) ; l'appelant est
 * responsable de le CHIFFRER avant persistance et de renvoyer l'id du message.
 */
export async function submitAnswer(
  surface: GameSurface,
  roundId: string,
  input: { answer?: string; guess?: string },
  postResultMessage: (plaintext: string) => Promise<string>,
): Promise<SubmitResult> {
  const where = surfaceWhere(surface);
  const round = await prisma.gameRound.findFirst({
    where: { id: roundId, ...where },
    include: { answers: true },
  });
  if (!round) throw new GameValidationError(404, "ROUND_NOT_FOUND");
  if (round.status === "REVEALED") {
    throw new GameValidationError(409, "ALREADY_REVEALED");
  }

  const patch = resolveSubmission(round, surface.userId, input);

  // Upsert de la ligne (round, user). @@unique([roundId, userId]) garantit
  // l'unicité ; on met à jour la colonne pertinente (answer OU guess).
  await prisma.gameRoundAnswer.upsert({
    where: { roundId_userId: { roundId: round.id, userId: surface.userId } },
    create: { roundId: round.id, userId: surface.userId, ...patch },
    update: patch,
  });

  // Relecture des réponses pour tester le reveal sur l'état à jour.
  const answers = await prisma.gameRoundAnswer.findMany({
    where: { roundId: round.id },
  });
  const fresh: RoundWithAnswers = { ...round, answers };

  // Les deux joueurs de la manche = {userId, otherUserId}. Le "non-initiateur"
  // est celui des deux qui n'est pas l'initiateur.
  const nonInitiator =
    round.initiatorId === surface.userId ? surface.otherUserId : surface.userId;
  if (!isRevealReady(fresh, round.initiatorId, nonInitiator)) {
    return {
      view: buildRoundView(fresh, surface),
      revealed: false,
      resultMessageId: null,
    };
  }

  // Reveal : poste le message de résultat (neutre), puis marque la manche.
  const text = resultMessageText(fresh, surface);
  const resultMessageId = await postResultMessage(text);
  const revealed = await prisma.gameRound.update({
    where: { id: round.id },
    data: {
      status: "REVEALED",
      revealedAt: new Date(),
      resultMessageId,
    },
    include: { answers: true },
  });

  return {
    view: buildRoundView(revealed, surface),
    revealed: true,
    resultMessageId,
  };
}

// ── Lecture d'état (GET) ─────────────────────────────────────────────────────
export type GameState = {
  rounds: RoundView[];
  seenCount: number;
  bankSize: number;
  bankRemaining: number;
};

/**
 * État du jeu pour une surface : manches récentes (filtrées-sécurisées),
 * curseur (seenCount) et banque restante. Le tri est décroissant (manche en
 * cours en tête).
 */
export async function getGameState(
  surface: GameSurface,
  take = 10,
): Promise<GameState> {
  const where = surfaceWhere(surface);
  const [rows, seenCount] = await Promise.all([
    prisma.gameRound.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      include: { answers: true },
    }),
    prisma.gameRound.count({ where }),
  ]);
  const bankRemaining = Math.max(0, QUESTION_COUNT - seenCount);
  return {
    rounds: rows.map((r) => buildRoundView(r, surface)),
    seenCount,
    bankSize: QUESTION_COUNT,
    bankRemaining,
  };
}
