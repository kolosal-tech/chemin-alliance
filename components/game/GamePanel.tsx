"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AsyncButton } from "@/components/AsyncButton";
import { Spinner } from "@/components/Spinner";
import { useToast } from "@/components/Toast";

/**
 * Panneau de jeu RÉUTILISABLE (construction C, hybride, SANS FIN).
 *
 * Paramétré par surface ("match" ou "couple") : seul `apiBase` change entre
 * les deux montages (`/api/matches/<id>/game` ou `/api/couple/game`), le
 * contrat GET/POST/answer étant un miroir exact entre les deux surfaces
 * (cf. app/api/matches/[matchId]/game/** et app/api/couple/game/**).
 *
 * SÉCURITÉ : ce composant ne fait QUE refléter ce que l'API renvoie. Avant
 * REVEALED, l'API ne fournit que des booléens "qui a soumis" — jamais le
 * contenu de l'autre joueur. Le composant n'a donc rien à cacher lui-même :
 * il affiche fidèlement l'absence de champ `reveal`.
 */

type GameMode = "SHARED" | "GUESS";
type RoundStatus = "OPEN" | "REVEALED";

type RevealView = {
  mode: GameMode;
  myAnswer: string | null;
  otherAnswer: string | null;
  myGuess: string | null;
  otherGuess: string | null;
  guessClose: boolean | null;
};

type RoundView = {
  id: string;
  mode: GameMode;
  questionKey: string | null;
  questionText: string | null;
  status: RoundStatus;
  initiatorId: string;
  createdAt: string;
  revealedAt: string | null;
  iSubmitted: boolean;
  otherSubmitted: boolean;
  reveal: RevealView | null;
};

type GameState = {
  rounds: RoundView[];
  seenCount: number;
  bankSize: number;
  bankRemaining: number;
};

export function GamePanel({
  surface,
  apiBase,
  currentUserId,
}: {
  surface: "match" | "couple";
  /** Base des routes : "/api/matches/<id>/game" ou "/api/couple/game". */
  apiBase: string;
  /** id du user courant, pour déterminer le rôle (initiateur vs autre) en mode GUESS. */
  currentUserId: string;
}) {
  const t = useTranslations("couple_game");
  const tc = useTranslations("common");
  const toast = useToast();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<GameState | null>(null);
  const [draft, setDraft] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiBase);
      if (!res.ok) {
        setError(t("loadError"));
        return;
      }
      const data = (await res.json()) as GameState;
      setState(data);
    } catch {
      setError(t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [apiBase, t]);

  useEffect(() => {
    if (open && !state) void load();
  }, [open, state, load]);

  async function createRound(mode: GameMode) {
    if (creating) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch(apiBase, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      if (!res.ok) {
        toast.error(t("createError"));
        return;
      }
      const data = (await res.json()) as { round: RoundView };
      setState((prev) =>
        prev
          ? { ...prev, rounds: [data.round, ...prev.rounds] }
          : {
              rounds: [data.round],
              seenCount: 1,
              bankSize: 0,
              bankRemaining: 0,
            },
      );
      setDraft("");
    } catch {
      toast.error(t("createError"));
    } finally {
      setCreating(false);
    }
  }

  async function submit(
    roundId: string,
    body: { answer?: string; guess?: string },
  ) {
    const text = (body.answer ?? body.guess ?? "").trim();
    if (!text) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/${roundId}/answer`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        toast.error(t("submitError"));
        return;
      }
      const data = (await res.json()) as {
        round: RoundView;
        revealed: boolean;
      };
      setState((prev) =>
        prev
          ? {
              ...prev,
              rounds: prev.rounds.map((r) =>
                r.id === data.round.id ? data.round : r,
              ),
            }
          : prev,
      );
      setDraft("");
      if (data.revealed) toast.success(t("revealedToast"));
    } catch {
      toast.error(t("submitError"));
    } finally {
      setCreating(false);
    }
  }

  // Manche "en cours" affichée : la plus récente encore OPEN. Sinon, la plus
  // récente (REVEALED) sert d'écran de reveal. SANS FIN : une seule manche
  // "active" à la fois côté UI, l'historique reste consultable en dessous.
  const current =
    state?.rounds.find((r) => r.status === "OPEN") ?? state?.rounds[0] ?? null;
  const history = state?.rounds.filter((r) => r.id !== current?.id) ?? [];

  function questionLabel(r: RoundView): string {
    if (r.questionText) return r.questionText;
    if (r.questionKey) {
      // Clé i18n de la banque curatée (namespace couple_game.questions.*).
      // Repli neutre si la clé est inconnue (banque i18n désynchronisée) :
      // ne jamais planter l'affichage sur une clé manquante.
      try {
        return t(`questions.${r.questionKey}` as Parameters<typeof t>[0]);
      } catch {
        return "";
      }
    }
    return "";
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-glass btn-glass-neutral flex items-center gap-1.5 rounded-btnsm px-3.5 py-2 text-[14px] font-semibold"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 3l1.8 4.7L18.5 9l-4.7 1.8L12 15l-1.8-4.2L5.5 9l4.7-1.3L12 3Z"
            fill="currentColor"
          />
        </svg>
        {t("ui.play")}
      </button>
    );
  }

  return (
    <section
      className={`rounded-cardlg border border-sand-200 bg-surface p-4 dark:border-anthracite-600 dark:bg-anthracite-800 ${
        surface === "couple" ? "mt-5" : "mt-3"
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-display text-[21px] text-night dark:text-[#ECE7DD]">
          {t("ui.title")}
        </h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label={tc("close")}
          className="flex-none text-warmgray dark:text-[#7E7A72]"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
      <p className="mt-1 text-[14px] leading-snug text-warmgray dark:text-[#9A958B]">
        {t("ui.subtitle")}
      </p>

      {loading && !state && (
        <div className="mt-4 flex items-center justify-center gap-2 py-6 text-sm text-warmgray dark:text-[#9A958B]">
          <Spinner className="h-4 w-4" />
          {tc("loading")}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-[15px] text-danger">
          {error}
        </p>
      )}

      {state && (
        <div className="mt-4">
          {!current ? (
            <div className="rounded-btn bg-sand-100 px-3.5 py-3 text-center text-[15px] text-sand-600 dark:bg-anthracite-700 dark:text-[#7E7A72]">
              {t("ui.empty")}
            </div>
          ) : (
            <RoundCard
              round={current}
              currentUserId={currentUserId}
              draft={draft}
              setDraft={setDraft}
              busy={creating}
              onSubmit={submit}
              questionLabel={questionLabel}
              t={t}
            />
          )}

          {/* Nouvelle manche : uniquement quand aucune manche n'est OPEN
              (sans fin, mais une manche à la fois). */}
          {(!current || current.status === "REVEALED") && (
            <div className="mt-4 border-t border-sand-200 pt-4 dark:border-anthracite-600">
              <span className="lbl text-[12px] text-gold-deep dark:text-gold-light">
                {t("ui.newRound")}
              </span>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <AsyncButton
                  onClick={() => createRound("SHARED")}
                  disabled={creating}
                  className="btn-glass btn-glass-blue flex-1 rounded-btnsm py-2.5 text-[14px] font-semibold disabled:opacity-60"
                >
                  {t("ui.modeShared")}
                </AsyncButton>
                <AsyncButton
                  onClick={() => createRound("GUESS")}
                  disabled={creating}
                  className="btn-glass btn-glass-neutral flex-1 rounded-btnsm py-2.5 text-[14px] font-semibold disabled:opacity-60"
                >
                  {t("ui.modeGuess")}
                </AsyncButton>
              </div>
            </div>
          )}

          {history.length > 0 && (
            <div className="mt-5 border-t border-sand-200 pt-3 dark:border-anthracite-600">
              <span className="lbl text-[12px] text-gold-deep dark:text-gold-light">
                {t("ui.revealTitle")}
              </span>
              <div className="mt-2 flex flex-col gap-2">
                {history
                  .filter((r) => r.status === "REVEALED")
                  .slice(0, 5)
                  .map((r) => (
                    <div
                      key={r.id}
                      className="rounded-btn border border-sand-200 bg-cream/60 px-3 py-2.5 text-[14px] dark:border-anthracite-600 dark:bg-anthracite-700/60"
                    >
                      <p className="font-display italic text-[#3A372F] dark:text-[#CFCAC0]">
                        {questionLabel(r)}
                      </p>
                      {r.reveal && (
                        <RevealSummary
                          reveal={r.reveal}
                          currentUserId={currentUserId}
                          round={r}
                          t={t}
                        />
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function RoundCard({
  round,
  currentUserId,
  draft,
  setDraft,
  busy,
  onSubmit,
  questionLabel,
  t,
}: {
  round: RoundView;
  currentUserId: string;
  draft: string;
  setDraft: (v: string) => void;
  busy: boolean;
  onSubmit: (
    roundId: string,
    body: { answer?: string; guess?: string },
  ) => Promise<void>;
  questionLabel: (r: RoundView) => string;
  t: ReturnType<typeof useTranslations>;
}) {
  const isInitiator = round.initiatorId === currentUserId;
  // Rôle : SHARED -> toujours "réponse honnête". GUESS -> l'initiateur répond
  // honnêtement, l'autre devine (cf. CONTRAT DU JEU).
  const role: "answer" | "guess" =
    round.mode === "SHARED" || isInitiator ? "answer" : "guess";
  const mySubmitted = round.iSubmitted;

  return (
    <div className="rounded-cardlg border border-gold/30 bg-[#FBF6E9] p-3.5 dark:border-gold-light/25 dark:bg-[#272117]">
      <div className="flex items-center gap-2">
        <span className="rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 text-[11px] font-semibold text-gold-deep dark:border-gold-light/30 dark:bg-gold-light/10 dark:text-gold-light">
          {round.mode === "SHARED" ? t("ui.modeShared") : t("ui.modeGuess")}
        </span>
        {round.questionKey === null && round.questionText !== null && (
          <span className="text-[11px] text-warmgray dark:text-[#7E7A72]">
            {t("ui.aiGenerated")}
          </span>
        )}
      </div>
      <p className="mt-2 font-display text-[19px] italic leading-snug text-night dark:text-[#ECE7DD]">
        {questionLabel(round)}
      </p>
      <p className="mt-1 text-[13px] text-warmgray dark:text-[#9A958B]">
        {round.mode === "GUESS"
          ? t("ui.modeGuessHint")
          : t("ui.modeSharedHint")}
      </p>

      {round.status === "REVEALED" && round.reveal ? (
        <RevealSummary
          reveal={round.reveal}
          currentUserId={currentUserId}
          round={round}
          t={t}
        />
      ) : mySubmitted ? (
        <p className="mt-3 rounded-btn bg-sand-100 px-3 py-2.5 text-[14px] text-sand-600 dark:bg-anthracite-700 dark:text-[#7E7A72]">
          {t("ui.sealed")}
        </p>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void onSubmit(
              round.id,
              role === "answer" ? { answer: draft } : { guess: draft },
            );
          }}
          className="mt-3 flex flex-col gap-2"
        >
          <label className="text-[13px] font-semibold text-night dark:text-[#ECE7DD]">
            {role === "answer" ? t("ui.yourAnswer") : t("ui.yourGuess")}
          </label>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={
              role === "answer"
                ? t("ui.answerPlaceholder")
                : t("ui.guessPlaceholder")
            }
            aria-label={
              role === "answer" ? t("ui.yourAnswer") : t("ui.yourGuess")
            }
            rows={3}
            maxLength={2000}
            className="w-full resize-y rounded-btnsm border border-sand-300 bg-surface px-3 py-2.5 text-[16px] leading-snug text-ink dark:border-anthracite-600 dark:bg-anthracite-700 dark:text-[#ECE7DD]"
          />
          <AsyncButton
            type="submit"
            disabled={busy || !draft.trim()}
            className="btn-glass btn-glass-blue self-end rounded-btnsm px-4 py-2.5 text-[14px] font-semibold disabled:opacity-60"
          >
            {t("ui.submit")}
          </AsyncButton>
        </form>
      )}

      {round.status === "OPEN" && !round.otherSubmitted && (
        <p className="mt-2 text-[13px] text-warmgray dark:text-[#9A958B]">
          {t("ui.waitingOther")}
        </p>
      )}
    </div>
  );
}

function RevealSummary({
  reveal,
  currentUserId,
  round,
  t,
}: {
  reveal: RevealView;
  currentUserId: string;
  round: RoundView;
  t: ReturnType<typeof useTranslations>;
}) {
  const isInitiator = round.initiatorId === currentUserId;
  // En SHARED : chacun affiche sa réponse honnête et celle de l'autre.
  // En GUESS : on affiche la réponse honnête (celle de l'initiateur) et la
  // devinette (celle du non-initiateur), quel que soit qui regarde.
  if (reveal.mode === "SHARED") {
    return (
      <div className="mt-3 flex flex-col gap-1.5 text-[14px]">
        <p>
          <span className="font-semibold text-night dark:text-[#ECE7DD]">
            {t("ui.youLabel")} ·{" "}
          </span>
          <span className="text-[#3A372F] dark:text-[#CFCAC0]">
            {reveal.myAnswer}
          </span>
        </p>
        <p>
          <span className="font-semibold text-night dark:text-[#ECE7DD]">
            {t("ui.otherLabel")} ·{" "}
          </span>
          <span className="text-[#3A372F] dark:text-[#CFCAC0]">
            {reveal.otherAnswer}
          </span>
        </p>
      </div>
    );
  }

  // GUESS
  const honest = isInitiator ? reveal.myAnswer : reveal.otherAnswer;
  const guess = isInitiator ? reveal.otherGuess : reveal.myGuess;
  return (
    <div className="mt-3 flex flex-col gap-1.5 text-[14px]">
      <p>
        <span className="font-semibold text-night dark:text-[#ECE7DD]">
          {isInitiator ? t("ui.youLabel") : t("ui.otherLabel")} ·{" "}
        </span>
        <span className="text-[#3A372F] dark:text-[#CFCAC0]">{honest}</span>
      </p>
      <p>
        <span className="font-semibold text-night dark:text-[#ECE7DD]">
          {isInitiator ? t("ui.otherLabel") : t("ui.youLabel")} ·{" "}
        </span>
        <span className="text-[#3A372F] dark:text-[#CFCAC0]">{guess}</span>
      </p>
      {reveal.guessClose !== null && (
        <p
          className={`mt-1 font-semibold ${
            reveal.guessClose
              ? "text-[#2E7D5B] dark:text-[#7FC9A6]"
              : "text-gold-deep dark:text-gold-light"
          }`}
        >
          {reveal.guessClose
            ? t("ui.guessResultClose")
            : t("ui.guessResultDifferent")}
        </p>
      )}
    </div>
  );
}
