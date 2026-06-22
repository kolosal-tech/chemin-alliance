"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { DailyDevotion } from "@/lib/devotional";
import {
  MeditationSession,
  JOURNAL_KEY,
  type JournalEntry,
} from "./meditation-session";
import { Spinner } from "@/components/Spinner";
import { useToast } from "@/components/Toast";

export function DevotionalClient({
  devotion,
  initialStreak,
  initialCompleted,
}: {
  devotion: DailyDevotion;
  initialStreak: { current: number; longest: number };
  initialCompleted: boolean;
}) {
  const t = useTranslations();
  const toast = useToast();
  const [streak, setStreak] = useState(initialStreak);
  const [completed, setCompleted] = useState(initialCompleted);
  const [busy, setBusy] = useState(false);
  const [newRecord, setNewRecord] = useState(false);
  const [error, setError] = useState(false);
  const [sessionOpen, setSessionOpen] = useState(false);
  const [lastReflection, setLastReflection] = useState<JournalEntry | null>(
    null,
  );
  const [showVerse, setShowVerse] = useState(false); // déplie le verset de la dernière réflexion
  const pendingRef = useRef(false); // anti double-soumission de markDone

  // Dernière réflexion (journal privé local) - affichée en rappel.
  useEffect(() => {
    const load = () => {
      try {
        const raw = localStorage.getItem(JOURNAL_KEY);
        const list: JournalEntry[] = raw ? JSON.parse(raw) : [];
        setLastReflection(list[0] ?? null);
      } catch {
        setLastReflection(null);
      }
    };
    load();
    window.addEventListener("meditation:journal", load);
    return () => window.removeEventListener("meditation:journal", load);
  }, []);

  async function markDone() {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setBusy(true);
    try {
      const res = await fetch("/api/me/devotional/mark-done", {
        method: "POST",
      });
      if (res.ok) {
        const d = await res.json();
        setStreak({ current: d.currentStreak, longest: d.longestStreak });
        setNewRecord(Boolean(d.isNewRecord));
        setCompleted(true);
        toast.success(
          d.isNewRecord
            ? t("devotional.newRecord")
            : t("devotional.markedDoneToast"),
        );
      } else {
        setError(true);
        toast.error(t("devotional.error"));
      }
    } catch {
      setError(true);
      toast.error(t("devotional.error"));
    } finally {
      pendingRef.current = false;
      setBusy(false);
    }
  }

  // Texte complet du verset de la dernière réflexion : mémorisé avec l'entrée
  // (nouvelles réflexions) ou, à défaut, le verset du jour si la référence
  // correspond. Sinon null → la référence reste un simple libellé.
  const lastVerse = lastReflection
    ? (lastReflection.verse ??
      (lastReflection.reference === devotion.reference ? devotion.verse : null))
    : null;

  return (
    <main className="px-5 pt-6 safe-top lg:mx-auto lg:max-w-2xl">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <span className="lbl text-[11px] text-gold-deep dark:text-gold-light">
            {t("devotional.subtitle")}
          </span>
          <h1 className="font-display text-2xl font-medium text-night dark:text-[#ECE7DD]">
            {t("devotional.title")}
          </h1>
        </div>
        <div className="flex gap-2">
          <div className="rounded-card border border-sand-200 bg-surface px-3 py-1.5 text-center dark:border-anthracite-600 dark:bg-anthracite-800">
            <div className="font-display text-xl text-gold-deep dark:text-gold-light">
              {streak.current}
            </div>
            <div className="lbl text-[10px] text-warmgray dark:text-[#9A958B]">
              {t("devotional.streakCurrent")}
            </div>
          </div>
          <div className="rounded-card border border-sand-200 bg-surface px-3 py-1.5 text-center dark:border-anthracite-600 dark:bg-anthracite-800">
            <div className="font-display text-xl text-night dark:text-[#ECE7DD]">
              {streak.longest}
            </div>
            <div className="lbl text-[10px] text-warmgray dark:text-[#9A958B]">
              {t("devotional.streakLongest")}
            </div>
          </div>
        </div>
      </div>

      <article className="rounded-cardlg border border-gold/30 bg-[#FBF6E9] p-5 dark:border-[#463A1F] dark:bg-[#272117]">
        <div className="lbl mb-1.5 text-[11px] text-gold-deep dark:text-gold-light">
          {devotion.reference}
        </div>
        <p className="font-display text-[22px] italic leading-snug text-night dark:text-[#ECE7DD]">
          « {devotion.verse} »
        </p>
      </article>

      {/* Entrée immersive - chemin principal, clarifie « quoi faire ici ». */}
      <button
        type="button"
        onClick={() => setSessionOpen(true)}
        className="mt-3 flex w-full items-center gap-3 rounded-cardlg bg-navy px-5 py-4 text-left dark:bg-gold-light"
      >
        <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-white/15 dark:bg-anthracite-900/15">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <circle
              cx="12"
              cy="12"
              r="8.5"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-[#F4F1EA] dark:text-anthracite-900"
            />
            <circle
              cx="12"
              cy="12"
              r="3"
              fill="currentColor"
              className="text-[#F4F1EA] dark:text-anthracite-900"
            />
          </svg>
        </span>
        <span className="flex-1">
          <span className="block text-base font-semibold text-[#F4F1EA] dark:text-anthracite-900">
            {t("devotional.start")}
          </span>
          <span className="block text-[15px] text-[#F4F1EA]/75 dark:text-anthracite-900/75">
            {t("devotional.startHint")}
          </span>
        </span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M9 6l6 6-6 6"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-[#F4F1EA] dark:text-anthracite-900"
          />
        </svg>
      </button>

      {lastReflection && (
        <section className="mt-3 rounded-card border border-sand-200 bg-surface p-4 dark:border-anthracite-600 dark:bg-anthracite-800">
          <div className="lbl mb-1.5 text-[11px] text-gold-deep dark:text-gold-light">
            {t("devotional.journalTitle")}
          </div>
          <p className="text-[16px] italic leading-normal text-[#3A372F] dark:text-[#CFCAC0]">
            « {lastReflection.text} »
          </p>
          {lastVerse ? (
            <>
              <button
                type="button"
                onClick={() => setShowVerse((v) => !v)}
                aria-expanded={showVerse}
                title={t("devotional.showVerse")}
                className="mt-1 inline-flex items-center gap-1 text-[13px] font-medium text-gold-deep underline decoration-dotted underline-offset-2 dark:text-gold-light"
              >
                {lastReflection.reference}
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden
                  className={`transition-transform ${showVerse ? "rotate-180" : ""}`}
                >
                  <path
                    d="M6 9l6 6 6-6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              {showVerse && (
                <p className="mt-1.5 rounded-btnsm bg-[#FBF6E9] px-3 py-2 font-display text-[16px] italic leading-snug text-night dark:bg-[#272117] dark:text-[#ECE7DD]">
                  « {lastVerse} »
                </p>
              )}
            </>
          ) : (
            <p className="mt-1 text-[13px] text-warmgray dark:text-[#9A958B]">
              {lastReflection.reference}
            </p>
          )}
        </section>
      )}

      <section className="mt-3 rounded-card border border-sand-200 bg-surface p-4 dark:border-anthracite-600 dark:bg-anthracite-800">
        <div className="lbl mb-1.5 text-[11px] text-gold-deep dark:text-gold-light">
          {t("devotional.meditation")}
        </div>
        <p className="text-[17px] leading-normal text-[#3A372F] dark:text-[#CFCAC0]">
          {devotion.meditation}
        </p>
      </section>

      <section className="mt-3 rounded-card border border-sand-200 bg-surface p-4 dark:border-anthracite-600 dark:bg-anthracite-800">
        <div className="lbl mb-1.5 text-[11px] text-gold-deep dark:text-gold-light">
          {t("devotional.reflection")}
        </div>
        <p className="font-display text-[18px] italic text-night dark:text-[#ECE7DD]">
          {devotion.reflection}
        </p>
      </section>

      <section className="mt-3 rounded-card border border-sand-200 bg-surface p-4 dark:border-anthracite-600 dark:bg-anthracite-800">
        <div className="lbl mb-1.5 text-[11px] text-gold-deep dark:text-gold-light">
          {t("devotional.prayer")}
        </div>
        <p className="text-[17px] leading-normal text-[#3A372F] dark:text-[#CFCAC0]">
          {devotion.prayer}
        </p>
      </section>

      {completed ? (
        <div className="mt-4 rounded-btnlg bg-[#EAF0EB] py-4 text-center text-[17px] font-semibold text-[#2E5440] dark:bg-[#1B2A20] dark:text-[#9FC7AC]">
          {t("devotional.completedToday")}
          {newRecord && ` · ${t("devotional.newRecord")}`}
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={markDone}
            disabled={busy}
            aria-busy={busy}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-btnlg border border-sand-200 py-3.5 text-[17px] font-medium text-warmgray disabled:opacity-60 dark:border-anthracite-600 dark:text-[#9A958B]"
          >
            {busy && <Spinner className="h-4 w-4" />}
            {t("devotional.markDone")}
          </button>
          {error && (
            <p className="mt-2 text-center text-[15px] text-[#9A3B30] dark:text-[#E0A99F]">
              {t("devotional.error")}
            </p>
          )}
        </>
      )}

      {sessionOpen && (
        <MeditationSession
          devotion={devotion}
          onCompleted={(d) => {
            setStreak({ current: d.current, longest: d.longest });
            setNewRecord(d.newRecord);
            setCompleted(true);
          }}
          onClose={() => setSessionOpen(false)}
        />
      )}
    </main>
  );
}
