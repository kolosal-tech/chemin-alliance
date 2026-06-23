"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SacredMotif } from "@/components/SacredMotif";
import { Icon } from "@/components/marketing/icons";
import { Spinner } from "@/components/Spinner";
import {
  MATURITY_AXES,
  OPTIONS_PER_AXIS,
  scoreMaturity,
  type MaturityAnswers,
  type MaturityResult,
} from "@/lib/maturity";

/**
 * Auto-bilan de maturité (« recto-verso ») - affiché une fois sur /suggestions
 * tant que `onboardingDoneAt` n'est pas posé (indépendant du gate Phase 2 :
 * posture ORIENTER, jamais bloquer). Flux : intro → 6 affirmations (échelle
 * partagée) → restitution + orientation douce (Méditer / coach). Le flag
 * persistant est posé dès l'affichage du résultat (les liens d'orientation ne
 * rejouent donc pas le questionnaire). `onDone` = variante sans réseau (vitrine
 * design-system) ; le résultat est aussi gardé device-local pour relecture.
 */

const RESULT_KEY = "ca:maturity:result";

type Step = "intro" | "questions" | "result";

export function OnboardingIntroCard({ onDone }: { onDone?: () => void }) {
  const t = useTranslations("maturity");
  const router = useRouter();
  const [step, setStep] = useState<Step>("intro");
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<MaturityAnswers>({});
  const [loading, setLoading] = useState(false);
  const persistedRef = useRef(false);

  const axis = MATURITY_AXES[index];
  const result = scoreMaturity(answers);
  const total = MATURITY_AXES.length;

  // Pose le flag persistant + garde le résultat en local. Idempotent (une fois).
  function persist(r: MaturityResult) {
    if (persistedRef.current) return;
    persistedRef.current = true;
    try {
      localStorage.setItem(
        RESULT_KEY,
        JSON.stringify({ ts: Date.now(), total: r.total, level: r.level }),
      );
    } catch {
      /* mode privé : sans gravité */
    }
    if (onDone) return; // vitrine : pas de réseau
    // P1 : on envoie le résultat complet pour la persistance serveur (le moteur
    // de matching l'exploite). fetch ne rejette pas sur 4xx/5xx ; échec non
    // bloquant (le bilan reste idempotent et réapparaît au besoin).
    fetch("/api/me/onboarding-done", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ maturity: r }),
    }).catch(() => {});
  }

  function choose(weight: number) {
    const next: MaturityAnswers = { ...answers, [axis]: weight };
    setAnswers(next);
    if (index + 1 < total) {
      setIndex(index + 1);
    } else {
      persist(scoreMaturity(next));
      setStep("result");
    }
  }

  function goBack() {
    if (index > 0) setIndex(index - 1);
    else setStep("intro");
  }

  function finish() {
    if (onDone) {
      onDone();
      return;
    }
    setLoading(true);
    router.refresh(); // le flag est déjà posé → le bilan se démonte
  }

  return (
    <section className="relative overflow-hidden rounded-cardlg border border-sand-200 bg-surface p-6 dark:border-anthracite-600 dark:bg-anthracite-800 sm:p-8">
      <SacredMotif
        variant="dove"
        className="-right-12 -top-8 hidden sm:block"
      />

      {step === "intro" && (
        <>
          <span className="flex h-12 w-12 items-center justify-center rounded-card bg-gold/15 text-gold-deep dark:text-gold-light">
            <Icon name="sparkle" className="h-6 w-6" strokeWidth={1.7} />
          </span>
          <span className="lbl mt-5 block text-[12px] text-gold-deep dark:text-gold-light">
            {t("introLabel")}
          </span>
          <h2 className="mt-1 font-display text-2xl text-night dark:text-[#ECE7DD]">
            {t("introTitle")}
          </h2>
          <p className="mt-2 max-w-prose text-[18px] leading-relaxed text-warmgray dark:text-[#9A958B]">
            {t("introBody")}
          </p>
          <button
            type="button"
            onClick={() => setStep("questions")}
            className="mt-7 inline-flex items-center gap-1.5 rounded-btn bg-navy px-6 py-3.5 text-[17px] font-semibold text-[#F4F1EA] transition-colors hover:bg-night dark:bg-gold-light dark:text-anthracite-900 dark:hover:bg-gold"
          >
            {t("introCta")}
            <Icon name="arrowRight" className="h-4 w-4" strokeWidth={1.9} />
          </button>
        </>
      )}

      {step === "questions" && (
        <>
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={goBack}
              className="-ml-1 flex items-center gap-1 text-[16px] font-medium text-warmgray dark:text-[#9A958B]"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden
              >
                <path
                  d="M15 5l-7 7 7 7"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {t("back")}
            </button>
            <span className="lbl text-[12px] text-gold-deep dark:text-gold-light">
              {t("progress", { current: index + 1, total })}
            </span>
          </div>

          <div
            className="mt-3 h-1 w-full rounded-full bg-sand-200 dark:bg-anthracite-700"
            aria-hidden
          >
            <div
              className="h-1 rounded-full bg-gold transition-all"
              style={{ width: `${(index / total) * 100}%` }}
            />
          </div>

          <h2 className="mb-5 mt-6 font-display text-[25px] leading-snug text-night dark:text-[#ECE7DD]">
            {t(`axis.${axis}.prompt`)}
          </h2>

          <div className="flex flex-col gap-2.5">
            {Array.from({ length: OPTIONS_PER_AXIS }).map((_, w) => (
              <button
                key={w}
                type="button"
                onClick={() => choose(w)}
                className="flex items-center justify-between rounded-card border border-sand-200 bg-cream/60 px-4 py-3.5 text-left text-[17px] text-night transition-colors hover:border-gold hover:bg-gold/5 dark:border-anthracite-600 dark:bg-anthracite-850/60 dark:text-[#ECE7DD] dark:hover:border-gold-light"
              >
                {t(`scale${w}`)}
                <span aria-hidden className="text-warmgray dark:text-[#9A958B]">
                  ›
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {step === "result" && (
        <>
          <span className="lbl text-[12px] text-gold-deep dark:text-gold-light">
            {t("resultLabel")}
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="font-display text-5xl text-night dark:text-[#ECE7DD]">
              {result.total}
            </span>
            <span className="text-[18px] text-warmgray dark:text-[#9A958B]">
              / 100
            </span>
          </div>
          <h2 className="mt-3 font-display text-xl text-night dark:text-[#ECE7DD]">
            {t(`level.${result.level}.title`)}
          </h2>
          <p className="mt-2 max-w-prose text-[17px] leading-relaxed text-warmgray dark:text-[#9A958B]">
            {t(`level.${result.level}.body`)}
          </p>

          {result.strengths.length > 0 && (
            <div className="mt-5">
              <p className="lbl text-[11px] text-gold-deep dark:text-gold-light">
                {t("strengthsLabel")}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {result.strengths.map((a) => (
                  <span
                    key={a}
                    className="rounded-full bg-[#EAF0EB] px-3 py-1 text-[15px] font-medium text-[#2E5440] dark:bg-[#1B2A20] dark:text-[#9FC7AC]"
                  >
                    {t(`axis.${a}.name`)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {result.growth.length > 0 && (
            <div className="mt-4">
              <p className="lbl text-[11px] text-gold-deep dark:text-gold-light">
                {t("growthLabel")}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {result.growth.map((a) => (
                  <span
                    key={a}
                    className="rounded-full bg-sand-100 px-3 py-1 text-[15px] font-medium text-[#6B665C] dark:bg-anthracite-700 dark:text-[#C2BCB0]"
                  >
                    {t(`axis.${a}.name`)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {result.suggestsPreparation && (
            <div className="mt-5 rounded-card border border-gold/30 bg-[#FBF6E9] p-4 dark:border-[#463A1F] dark:bg-[#272117]">
              <p className="font-display text-[18px] text-night dark:text-[#ECE7DD]">
                {t("orientTitle")}
              </p>
              <p className="mt-1 text-[16px] leading-normal text-[#6F5C2E] dark:text-[#C2B488]">
                {t("orientBody")}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href="/devotional"
                  className="rounded-btnsm bg-navy px-4 py-2.5 text-[16px] font-semibold text-[#F4F1EA] dark:bg-gold-light dark:text-anthracite-900"
                >
                  {t("orientMeditate")}
                </Link>
                <Link
                  href="/coaches"
                  className="rounded-btnsm border border-gold bg-surface px-4 py-2.5 text-[16px] font-semibold text-gold-ink dark:border-[#6A5A2E] dark:bg-anthracite-800 dark:text-[#E0C77A]"
                >
                  {t("orientCoach")}
                </Link>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={finish}
            disabled={loading}
            className="mt-6 inline-flex items-center justify-center gap-1.5 rounded-btn bg-navy px-6 py-3.5 text-[17px] font-semibold text-[#F4F1EA] transition-colors hover:bg-night disabled:opacity-60 dark:bg-gold-light dark:text-anthracite-900 dark:hover:bg-gold"
          >
            {t("finish")}
            {loading ? (
              <Spinner className="h-4 w-4" />
            ) : (
              <Icon name="arrowRight" className="h-4 w-4" strokeWidth={1.9} />
            )}
          </button>
        </>
      )}
    </section>
  );
}
