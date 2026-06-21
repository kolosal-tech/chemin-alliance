"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SacredMotif } from "@/components/SacredMotif";
import { AsyncButton } from "@/components/AsyncButton";

type Portrait = {
  dimensions: Record<
    string,
    { status: "solid" | "growing" | "accompany"; note: string }
  >;
  overall: "matching_ready" | "growth_path" | "human_support";
  word: string;
};

const DIMS = [
  "spiritualRooting",
  "emotionalStability",
  "intentionClarity",
  "supportNetwork",
  "lifeAvailability",
] as const;

const STATUS_STYLE: Record<string, string> = {
  solid: "bg-[#EAF0EB] text-sage dark:bg-[#1B2A20] dark:text-[#7FA98C]",
  growing: "bg-[#F1EBD9] text-gold-ink dark:bg-[#2C2818] dark:text-gold-light",
  accompany:
    "bg-[#EAEDF2] text-[#2A3550] dark:bg-[#1A2233] dark:text-[#B9C6E0]",
};

export function PreparationFlow({
  questions,
}: {
  questions: Array<{ id: string; text: string }>;
}) {
  const t = useTranslations("agents.prep");
  const tc = useTranslations("common");
  const [phase, setPhase] = useState<
    "intro" | "interview" | "analyzing" | "portrait"
  >("intro");
  const [consent, setConsent] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [portrait, setPortrait] = useState<Portrait | null>(null);

  useEffect(() => {
    fetch("/api/agents/preparation")
      .then((r) => r.json())
      .then((d) => {
        if (d.portrait) {
          setPortrait(d.portrait);
          setPhase("portrait");
        }
      })
      .catch(() => {});
  }, []);

  async function submit() {
    setPhase("analyzing");
    const res = await fetch("/api/agents/preparation", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        consent: true,
        answers: questions
          .map((q) => ({ id: q.id, answer: answers[q.id] ?? "" }))
          .filter((a) => a.answer.trim()),
      }),
    });
    if (res.ok) {
      const d = await res.json();
      setPortrait(d.portrait);
      setPhase("portrait");
    } else {
      setPhase("interview");
    }
  }

  async function revoke() {
    await fetch("/api/agents/preparation", { method: "DELETE" });
    setPortrait(null);
    setAnswers({});
    setStep(0);
    setPhase("intro");
  }

  return (
    <main className="relative px-5 pt-6 safe-top lg:mx-auto lg:max-w-2xl">
      <SacredMotif variant="tree" className="right-[-120px] top-[40px]" />
      <span className="lbl text-[10px] text-gold-deep dark:text-gold-light">
        {t("title")}
      </span>
      <h1 className="mb-1 mt-1 font-display text-[26px] leading-tight text-night dark:text-[#ECE7DD]">
        {t("subtitle")}
      </h1>

      {phase === "intro" && (
        <section className="mt-5">
          <p className="text-[15px] leading-relaxed text-warmgray dark:text-[#9A958B]">
            {t("intro")}
          </p>
          <label className="mt-5 flex items-start gap-3 rounded-card border border-sand-200 bg-surface p-4 text-[12.5px] leading-normal text-warmgray dark:border-anthracite-600 dark:bg-anthracite-800 dark:text-[#9A958B]">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[#1A2744]"
            />
            <span>{t("consent")}</span>
          </label>
          <button
            type="button"
            disabled={!consent}
            onClick={() => setPhase("interview")}
            className="mt-4 w-full rounded-btnlg bg-navy py-4 text-base font-semibold text-[#F4F1EA] disabled:opacity-50 dark:bg-gold-light dark:text-anthracite-900"
          >
            {t("start")}
          </button>
        </section>
      )}

      {phase === "interview" && (
        <section className="mt-5">
          <div className="mb-3 flex gap-1.5" aria-hidden>
            {questions.map((_, i) => (
              <span
                key={i}
                className={`h-1 flex-1 rounded-full ${i <= step ? "bg-gold" : "bg-sand-300 dark:bg-anthracite-600"}`}
              />
            ))}
          </div>
          <div className="rounded-cardlg border border-sand-200 bg-surface p-5 dark:border-anthracite-600 dark:bg-anthracite-800">
            <p className="font-display text-[18px] italic leading-snug text-[#3A372F] dark:text-[#CFCAC0]">
              {questions[step].text}
            </p>
            <textarea
              value={answers[questions[step].id] ?? ""}
              onChange={(e) =>
                setAnswers((a) => ({
                  ...a,
                  [questions[step].id]: e.target.value,
                }))
              }
              rows={5}
              className="mt-4 w-full resize-none rounded-btn border border-sand-300 bg-white p-3.5 text-sm text-ink outline-none dark:border-anthracite-600 dark:bg-anthracite-700 dark:text-[#ECE7DD]"
            />
            <div className="mt-3 flex justify-between">
              {step > 0 ? (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="px-3 py-2.5 text-sm font-medium text-warmgray dark:text-[#9A958B]"
                >
                  {tc("back")}
                </button>
              ) : (
                <span />
              )}
              {step < questions.length - 1 ? (
                <button
                  type="button"
                  disabled={!(answers[questions[step].id] ?? "").trim()}
                  onClick={() => setStep(step + 1)}
                  className="rounded-btnsm bg-navy px-5 py-2.5 text-sm font-semibold text-[#F4F1EA] disabled:opacity-50 dark:bg-gold-light dark:text-anthracite-900"
                >
                  {t("next")}
                </button>
              ) : (
                <AsyncButton
                  disabled={!(answers[questions[step].id] ?? "").trim()}
                  onClick={submit}
                  className="rounded-btnsm bg-gold px-5 py-2.5 text-sm font-semibold text-night disabled:opacity-50"
                >
                  {t("submit")}
                </AsyncButton>
              )}
            </div>
          </div>
        </section>
      )}

      {phase === "analyzing" && (
        <p
          role="status"
          className="mt-8 text-center font-display text-[17px] italic text-warmgray dark:text-[#9A958B]"
        >
          {t("analyzing")}
        </p>
      )}

      {phase === "portrait" && portrait && (
        <section className="mt-5 pb-8">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="lbl text-[9.5px] text-gold-deep dark:text-gold-light">
              {t("portraitTitle")}
            </h2>
            <span className="text-[10.5px] text-sand-500 dark:text-[#65625B]">
              {t("neverScore")}
            </span>
          </div>
          <div className="overflow-hidden rounded-cardlg border border-sand-200 bg-surface dark:border-anthracite-600 dark:bg-anthracite-800">
            {DIMS.map((d, i) => {
              const dim = portrait.dimensions[d];
              if (!dim) return null;
              return (
                <div
                  key={d}
                  className={`px-4 py-3.5 ${i < DIMS.length - 1 ? "border-b border-sand-100 dark:border-anthracite-700" : ""}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-ink dark:text-[#ECE7DD]">
                      {t(`dim${d.charAt(0).toUpperCase() + d.slice(1)}`)}
                    </span>
                    <span
                      className={`rounded-[8px] px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLE[dim.status]}`}
                    >
                      {t(
                        `status${dim.status.charAt(0).toUpperCase() + dim.status.slice(1)}`,
                      )}
                    </span>
                  </div>
                  {dim.note && (
                    <p className="mt-1.5 text-[12.5px] leading-snug text-warmgray dark:text-[#9A958B]">
                      {dim.note}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-4 rounded-cardlg bg-night p-5 text-[#F2EFE8] dark:border dark:border-[#283655] dark:bg-[#1B2740]">
            <p className="font-display text-[16px] italic leading-relaxed text-[#D7DCE6]">
              {portrait.overall === "matching_ready" && t("overallReady")}
              {portrait.overall === "growth_path" && t("overallGrowth")}
              {portrait.overall === "human_support" && t("overallHuman")}
            </p>
            {portrait.word && (
              <p className="mt-3 text-[13.5px] leading-relaxed text-[#B9C0CE]">
                {portrait.word}
              </p>
            )}
          </div>

          {/* Routage par maturité : l'agent PROPOSE, ne bloque jamais l'accès. */}
          {portrait.overall === "matching_ready" && (
            <>
              <Link
                href="/suggestions"
                className="mt-4 block rounded-btnlg bg-gold py-4 text-center text-base font-semibold text-night"
              >
                {t("readyCta")} →
              </Link>
              <Link
                href="/preparation/modules"
                className="mt-2 block py-2 text-center text-[12.5px] text-warmgray underline dark:text-[#9A958B]"
              >
                {t("modulesCta")}
              </Link>
            </>
          )}

          {portrait.overall === "growth_path" && (
            <div className="mt-4 rounded-cardlg border border-gold/40 bg-[#FBF6E9] p-5 dark:border-[#463A1F] dark:bg-[#272117]">
              <h3 className="font-display text-[18px] text-gold-ink dark:text-[#E0C77A]">
                {t("growthTitle")}
              </h3>
              <p className="mt-1.5 text-[13px] leading-normal text-[#6F5C2E] dark:text-[#C2B488]">
                {t("growthBody")}
              </p>
              <Link
                href="/preparation/modules"
                className="mt-3 block rounded-btnsm bg-gold py-3 text-center text-sm font-semibold text-night"
              >
                {t("modulesCta")}
              </Link>
              <Link
                href="/coaches"
                className="mt-2 block rounded-btnsm border border-gold bg-white py-3 text-center text-sm font-semibold text-gold-ink dark:border-[#6A5A2E] dark:bg-anthracite-800 dark:text-[#E0C77A]"
              >
                {t("growthCta")}
              </Link>
              {/* Jamais bloquant : la personne reste libre d'avancer. */}
              <Link
                href="/suggestions"
                className="mt-2 block py-2 text-center text-[12.5px] text-warmgray underline dark:text-[#9A958B]"
              >
                {t("growthSkip")}
              </Link>
            </div>
          )}

          {portrait.overall === "human_support" && (
            <div className="mt-4 rounded-cardlg border border-[#C9D2E4] bg-[#EEF1F7] p-5 dark:border-[#2A3550] dark:bg-[#171F2E]">
              <h3 className="font-display text-[18px] text-[#2A3550] dark:text-[#B9C6E0]">
                {t("humanTitle")}
              </h3>
              <p className="mt-1.5 text-[13px] leading-normal text-[#46506A] dark:text-[#9FAAC4]">
                {t("humanBody")}
              </p>
              <Link
                href="/coaches"
                className="mt-3 block rounded-btnsm bg-night py-3 text-center text-sm font-semibold text-[#F2EFE8] dark:bg-[#23314F]"
              >
                {t("humanCta")}
              </Link>
            </div>
          )}

          <div className="mt-5 flex gap-2.5">
            <button
              type="button"
              onClick={() => {
                setPhase("interview");
                setStep(0);
              }}
              className="flex-1 rounded-btnsm border border-sand-400 py-3 text-[13px] font-medium text-warmgray dark:border-anthracite-600 dark:text-[#9A958B]"
            >
              {t("redo")}
            </button>
            <AsyncButton
              onClick={revoke}
              className="flex-1 rounded-btnsm border border-[#D8B6B0] py-3 text-[13px] font-medium text-danger dark:border-[#5A3A34]"
            >
              {t("revoke")}
            </AsyncButton>
          </div>
        </section>
      )}
    </main>
  );
}
