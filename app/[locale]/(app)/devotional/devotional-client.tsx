"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { DailyDevotion } from "@/lib/devotional";

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
  const [streak, setStreak] = useState(initialStreak);
  const [completed, setCompleted] = useState(initialCompleted);
  const [busy, setBusy] = useState(false);
  const [newRecord, setNewRecord] = useState(false);
  const [error, setError] = useState(false);

  async function markDone() {
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
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    }
    setBusy(false);
  }

  return (
    <main className="px-5 pt-6 safe-top lg:mx-auto lg:max-w-2xl">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <span className="lbl text-[9px] text-gold-deep dark:text-gold-light">
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
            <div className="lbl text-[8px] text-warmgray dark:text-[#9A958B]">
              {t("devotional.streakCurrent")}
            </div>
          </div>
          <div className="rounded-card border border-sand-200 bg-surface px-3 py-1.5 text-center dark:border-anthracite-600 dark:bg-anthracite-800">
            <div className="font-display text-xl text-night dark:text-[#ECE7DD]">
              {streak.longest}
            </div>
            <div className="lbl text-[8px] text-warmgray dark:text-[#9A958B]">
              {t("devotional.streakLongest")}
            </div>
          </div>
        </div>
      </div>

      <article className="rounded-cardlg border border-gold/30 bg-[#FBF6E9] p-5 dark:border-[#463A1F] dark:bg-[#272117]">
        <div className="lbl mb-1.5 text-[9px] text-gold-deep dark:text-gold-light">
          {devotion.reference}
        </div>
        <p className="font-display text-[19px] italic leading-snug text-night dark:text-[#ECE7DD]">
          « {devotion.verse} »
        </p>
      </article>

      <section className="mt-3 rounded-card border border-sand-200 bg-surface p-4 dark:border-anthracite-600 dark:bg-anthracite-800">
        <div className="lbl mb-1.5 text-[9px] text-gold-deep dark:text-gold-light">
          {t("devotional.meditation")}
        </div>
        <p className="text-[14px] leading-normal text-[#3A372F] dark:text-[#CFCAC0]">
          {devotion.meditation}
        </p>
      </section>

      <section className="mt-3 rounded-card border border-sand-200 bg-surface p-4 dark:border-anthracite-600 dark:bg-anthracite-800">
        <div className="lbl mb-1.5 text-[9px] text-gold-deep dark:text-gold-light">
          {t("devotional.reflection")}
        </div>
        <p className="font-display text-[15px] italic text-night dark:text-[#ECE7DD]">
          {devotion.reflection}
        </p>
      </section>

      <section className="mt-3 rounded-card border border-sand-200 bg-surface p-4 dark:border-anthracite-600 dark:bg-anthracite-800">
        <div className="lbl mb-1.5 text-[9px] text-gold-deep dark:text-gold-light">
          {t("devotional.prayer")}
        </div>
        <p className="text-[14px] leading-normal text-[#3A372F] dark:text-[#CFCAC0]">
          {devotion.prayer}
        </p>
      </section>

      {completed ? (
        <div className="mt-4 rounded-btnlg bg-[#EAF0EB] py-4 text-center text-[14px] font-semibold text-[#2E5440] dark:bg-[#1B2A20] dark:text-[#9FC7AC]">
          {t("devotional.completedToday")}
          {newRecord && ` · ${t("devotional.newRecord")}`}
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={markDone}
            disabled={busy}
            className="mt-4 w-full rounded-btnlg bg-navy py-4 text-base font-semibold text-[#F4F1EA] disabled:opacity-50 dark:bg-gold-light dark:text-anthracite-900"
          >
            {t("devotional.markDone")}
          </button>
          {error && (
            <p className="mt-2 text-center text-[12.5px] text-[#9A3B30] dark:text-[#E0A99F]">
              {t("devotional.error")}
            </p>
          )}
        </>
      )}
    </main>
  );
}
