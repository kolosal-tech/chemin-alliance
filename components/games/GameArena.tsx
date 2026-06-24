"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AsyncButton } from "@/components/AsyncButton";
import { Spinner } from "@/components/Spinner";

type DiscCode = "D" | "I" | "S" | "C";

export type ArenaQuestion = {
  key: string; // "disc.q1" | "deep.q3"
  prompt: string; // deja traduit (passe par le serveur via getTranslations)
  options?: Record<DiscCode, string>; // present pour DISC seulement
};

export type ArenaPersona = {
  displayName: string;
  bio?: string | null;
  avatarGradient: number;
};

const GRADIENTS = [
  "radial-gradient(120% 100% at 30% 20%, #6E7790 0%, #41506E 55%, #222F4C 100%)",
  "radial-gradient(120% 100% at 35% 25%, #8A7A6A 0%, #5C4D44 55%, #352A28 100%)",
  "radial-gradient(120% 100% at 30% 20%, #6F8478 0%, #43564B 55%, #26342C 100%)",
];

/** Cadre "parchemin" reutilise pour les deux faces. Encart ivoire en clair, anthracite en sombre (jamais navy). */
function Parchment({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "user" | "persona";
}) {
  return (
    <div
      className={`flex flex-1 flex-col rounded-cardlg border p-5 shadow-card ${
        tone === "persona"
          ? "border-gold/30 bg-surface dark:border-gold-light/20 dark:bg-anthracite-800"
          : "border-sand-200 bg-surface dark:border-anthracite-600 dark:bg-anthracite-800"
      }`}
    >
      {children}
    </div>
  );
}

export function GameArena({
  persona,
  questions,
  isDisc,
  onAnswer,
  onFinish,
}: {
  persona: ArenaPersona;
  questions: ArenaQuestion[];
  isDisc: boolean;
  onAnswer: (q: ArenaQuestion, userAnswer: string) => Promise<string | null>;
  onFinish: (
    pairs: Array<{ key: string; userAnswer: string; personaAnswer: string | null }>,
  ) => Promise<string | null>;
}) {
  const t = useTranslations("alliance_lab");
  const [index, setIndex] = useState(0);
  const [text, setText] = useState("");
  const [userAnswer, setUserAnswer] = useState<string | null>(null);
  const [personaAnswer, setPersonaAnswer] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [pairs, setPairs] = useState<
    Array<{ key: string; userAnswer: string; personaAnswer: string | null }>
  >([]);
  const [synthesis, setSynthesis] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);

  const q = questions[index];
  const total = questions.length;
  const isLast = index === total - 1;

  async function submit(answer: string) {
    if (!answer.trim() || waiting) return;
    setUserAnswer(answer);
    setWaiting(true);
    const reply = await onAnswer(q, answer);
    setPersonaAnswer(reply);
    setWaiting(false);
    setPairs((p) => [...p, { key: q.key, userAnswer: answer, personaAnswer: reply }]);
  }

  function next() {
    setUserAnswer(null);
    setPersonaAnswer(null);
    setText("");
    setIndex((i) => i + 1);
  }

  async function finish() {
    setFinishing(true);
    const synth = await onFinish(pairs);
    setSynthesis(synth ?? t("arena.synthesisTitle"));
    setFinishing(false);
  }

  // Ecran de synthese finale (Pasteur IA).
  if (synthesis !== null) {
    return (
      <main className="mx-auto max-w-2xl px-3 pt-6 safe-top">
        <div className="rounded-cardlg border border-gold/30 bg-surface p-6 dark:border-gold-light/20 dark:bg-anthracite-800">
          <span className="lbl text-[11px] text-gold-deep dark:text-gold-light">
            {t("arena.synthesisTitle")}
          </span>
          <p className="mt-3 whitespace-pre-line font-display text-[18px] leading-relaxed text-night dark:text-[#ECE7DD]">
            {synthesis}
          </p>
        </div>
        <p className="mt-4 text-center text-[13px] text-warmgray dark:text-[#8B8579]">
          {t("badge.disclaimer")}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-3 pt-6 safe-top">
      <header className="mb-4 rounded-cardlg border border-sand-200 bg-cream/80 p-4 dark:border-anthracite-600 dark:bg-anthracite-850/80">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-xl font-medium text-night dark:text-[#ECE7DD]">
            {t("title")}
          </h1>
          <span className="rounded-full border border-gold/40 bg-gold/15 px-2.5 py-0.5 text-[12px] font-semibold text-gold-deep dark:text-gold-light">
            {t("badge.echo")}
          </span>
        </div>
        <p className="mt-1 text-[13px] text-warmgray dark:text-[#9A958B]">
          {t("arena.progress", { current: index + 1, total })}
        </p>
      </header>

      <p className="mb-4 px-1 font-display text-[19px] leading-snug text-night dark:text-[#ECE7DD]">
        {q.prompt}
      </p>

      {/* Double parchemin : empile en mobile (390px), face-a-face en lg */}
      <div className="flex flex-col gap-3.5 lg:flex-row lg:items-stretch">
        <Parchment tone="user">
          <span className="lbl mb-2 text-[11px] text-warmgray dark:text-[#9A958B]">
            {t("arena.yourTurn")}
          </span>

          {userAnswer ? (
            <p className="font-display text-[16px] italic leading-snug text-[#3A372F] dark:text-[#CFCAC0]">
              {userAnswer}
            </p>
          ) : isDisc && q.options ? (
            <div className="flex flex-col gap-2">
              {(Object.keys(q.options) as DiscCode[]).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => submit(q.options![code])}
                  disabled={waiting}
                  className="rounded-btn border border-sand-400 px-3 py-2.5 text-left text-[15px] text-night transition-colors hover:border-gold/60 disabled:opacity-50 dark:border-anthracite-600 dark:text-[#ECE7DD] dark:hover:border-gold-light/50"
                >
                  {q.options![code]}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={4}
                placeholder={t("arena.placeholder")}
                className="resize-none rounded-btnsm border border-sand-400 bg-cream/60 px-3 py-2.5 text-[15px] text-ink dark:border-anthracite-600 dark:bg-anthracite-700 dark:text-[#ECE7DD]"
              />
              <AsyncButton
                onClick={() => submit(text)}
                className="self-end rounded-btn bg-navy px-4 py-2.5 text-sm font-semibold text-[#F4F1EA] dark:bg-gold-light dark:text-anthracite-900"
              >
                {t("arena.send")}
              </AsyncButton>
            </div>
          )}
        </Parchment>

        <Parchment tone="persona">
          <div className="mb-2 flex items-center gap-2">
            <span
              aria-hidden
              className="h-7 w-7 flex-none rounded-full"
              style={{ background: GRADIENTS[persona.avatarGradient % GRADIENTS.length] }}
            />
            <span className="text-[14px] font-semibold text-night dark:text-[#ECE7DD]">
              {persona.displayName}
            </span>
            <span className="rounded-full border border-gold/40 bg-gold/15 px-2 py-0.5 text-[10px] font-semibold text-gold-deep dark:text-gold-light">
              {t("badge.trainingPartner")}
            </span>
          </div>

          {waiting ? (
            <p className="flex items-center gap-2 text-[15px] text-warmgray dark:text-[#9A958B]">
              <Spinner className="h-4 w-4" />
              {t("waiting.discerning", { name: persona.displayName })}
            </p>
          ) : personaAnswer ? (
            <p className="font-display text-[16px] leading-snug text-[#3A372F] dark:text-[#CFCAC0]">
              {personaAnswer}
            </p>
          ) : (
            <p className="text-[15px] text-warmgray/70 dark:text-[#8B8579]">
              {t("arena.personaTurn", { name: persona.displayName })}
            </p>
          )}
        </Parchment>
      </div>

      {personaAnswer && !waiting && (
        <div className="mt-4 flex justify-end">
          {isLast ? (
            <AsyncButton
              onClick={finish}
              className="rounded-btn bg-gold-deep px-5 py-3 text-sm font-semibold text-[#F4F1EA] dark:bg-gold-light dark:text-anthracite-900"
            >
              {finishing ? t("waiting.synthesis") : t("arena.finish")}
            </AsyncButton>
          ) : (
            <button
              type="button"
              onClick={next}
              className="flex items-center gap-1.5 rounded-btn border border-sand-400 px-5 py-3 text-sm font-semibold text-night dark:border-anthracite-600 dark:text-[#ECE7DD]"
            >
              {t("arena.next")} <span aria-hidden>{"→"}</span>
            </button>
          )}
        </div>
      )}

      <p className="mt-5 text-center text-[12px] text-warmgray dark:text-[#8B8579]">
        {t("badge.disclaimer")}
      </p>
    </main>
  );
}
