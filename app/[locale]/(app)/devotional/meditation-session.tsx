"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { DailyDevotion } from "@/lib/devotional";

// Session de méditation immersive : préparation → respiration guidée (cercle
// animé + verset comme ancre, écran maintenu allumé via Wake Lock, sortie
// confirmée) → réflexion personnelle (journal privé local) → clôture (marque le
// dévotionnel fait + streak). Aucun stockage serveur : la réflexion reste sur
// l'appareil (clé localStorage), choix volontaire pour ces notes intimes.

const DURATIONS = [1, 3, 5] as const; // minutes
const CYCLE_SEC = 8; // cycle respiratoire (4s inspire / 4s expire)
export const JOURNAL_KEY = "ca:meditation:journal";

export type JournalEntry = {
  ts: number;
  devotionId: string;
  reference: string;
  text: string;
};

type Step = "intro" | "breathing" | "reflection" | "done";

type WakeLockSentinelLike = { release: () => Promise<void> };
type WakeLockNavigator = Navigator & {
  wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> };
};

function appendJournal(entry: JournalEntry) {
  try {
    const raw = localStorage.getItem(JOURNAL_KEY);
    const list: JournalEntry[] = raw ? JSON.parse(raw) : [];
    list.unshift(entry);
    localStorage.setItem(JOURNAL_KEY, JSON.stringify(list.slice(0, 30)));
  } catch {
    /* localStorage indisponible (mode privé) : on n'échoue pas la séance */
  }
}

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function MeditationSession({
  devotion,
  onCompleted,
  onClose,
}: {
  devotion: DailyDevotion;
  onCompleted: (data: {
    current: number;
    longest: number;
    newRecord: boolean;
  }) => void;
  onClose: () => void;
}) {
  const t = useTranslations("devotional");
  const [step, setStep] = useState<Step>("intro");
  const [minutes, setMinutes] = useState<number>(1);
  const [elapsed, setElapsed] = useState(0);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const [confirmSkip, setConfirmSkip] = useState(false);
  const [reflection, setReflection] = useState("");
  const [saving, setSaving] = useState(false);
  const wakeRef = useRef<WakeLockSentinelLike | null>(null);

  const total = minutes * 60;
  const remaining = Math.max(0, total - elapsed);
  const inhaling = elapsed % CYCLE_SEC < CYCLE_SEC / 2;

  // Compte à rebours de la phase respiration.
  useEffect(() => {
    if (step !== "breathing") return;
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [step]);

  // Fin du minuteur → réflexion.
  useEffect(() => {
    if (step === "breathing" && elapsed >= total) setStep("reflection");
  }, [step, elapsed, total]);

  // Wake Lock : garde l'écran allumé pendant la respiration (best-effort).
  useEffect(() => {
    if (step !== "breathing") return;
    let released = false;
    const nav = navigator as WakeLockNavigator;
    const acquire = async () => {
      try {
        if (nav.wakeLock)
          wakeRef.current = await nav.wakeLock.request("screen");
      } catch {
        /* refusé / non supporté : la séance continue sans */
      }
    };
    acquire();
    const onVisible = () => {
      if (document.visibilityState === "visible" && !released) {
        // Libère un éventuel sentinel périmé avant de ré-acquérir (anti-fuite).
        wakeRef.current?.release().catch(() => {});
        wakeRef.current = null;
        acquire();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      released = true;
      document.removeEventListener("visibilitychange", onVisible);
      wakeRef.current?.release().catch(() => {});
      wakeRef.current = null;
    };
  }, [step]);

  const finish = useCallback(async () => {
    const text = reflection.trim();
    if (text) {
      appendJournal({
        ts: Date.now(),
        devotionId: devotion.id,
        reference: devotion.reference,
        text,
      });
      window.dispatchEvent(new Event("meditation:journal"));
    }
    setSaving(true);
    try {
      const res = await fetch("/api/me/devotional/mark-done", {
        method: "POST",
      });
      if (res.ok) {
        const d = await res.json();
        onCompleted({
          current: d.currentStreak,
          longest: d.longestStreak,
          newRecord: Boolean(d.isNewRecord),
        });
      }
    } catch {
      /* le streak n'a pas avancé ; la séance reste valable côté ressenti */
    } finally {
      setSaving(false);
      setStep("done");
    }
  }, [reflection, devotion, onCompleted]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("sessionTitle")}
      className="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-[#FBF7EC] to-[#F1E9D5] text-night dark:from-[#16130E] dark:to-[#1E1810] dark:text-[#ECE7DD]"
    >
      <style>{`
        @keyframes caBreathe { 0%,100% { transform: scale(.62); opacity:.75 } 50% { transform: scale(1); opacity:1 } }
        @media (prefers-reduced-motion: reduce) { .ca-breathe { animation: none !important } }
      `}</style>

      {/* ─────────────── INTRO ─────────────── */}
      {step === "intro" && (
        <div className="flex flex-1 flex-col px-6 pt-8 safe-top">
          <button
            type="button"
            onClick={onClose}
            className="self-end rounded-full px-3 py-1.5 text-[13px] text-warmgray dark:text-[#9A958B]"
          >
            {t("close")}
          </button>
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <span className="lbl text-[10px] text-gold-deep dark:text-gold-light">
              {devotion.reference}
            </span>
            <p className="mt-3 max-w-sm font-display text-[22px] italic leading-snug">
              « {devotion.verse} »
            </p>
            <p className="mt-6 max-w-xs text-[14px] leading-relaxed text-[#4A463C] dark:text-[#B7B1A4]">
              {t("introGuide")}
            </p>

            <div className="mt-7 w-full max-w-xs">
              <div className="lbl mb-2 text-[9px] text-gold-deep dark:text-gold-light">
                {t("durationLabel")}
              </div>
              <div className="flex gap-2">
                {DURATIONS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMinutes(m)}
                    aria-pressed={minutes === m}
                    className={`flex-1 rounded-btn border py-3 text-[14px] font-semibold transition ${
                      minutes === m
                        ? "border-gold bg-gold/15 text-gold-deep dark:text-gold-light"
                        : "border-sand-200 text-warmgray dark:border-anthracite-600 dark:text-[#9A958B]"
                    }`}
                  >
                    {t("minutes", { count: m })}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setElapsed(0);
              setStep("breathing");
            }}
            className="mb-8 w-full rounded-btnlg bg-navy py-4 text-base font-semibold text-[#F4F1EA] dark:bg-gold-light dark:text-anthracite-900"
          >
            {t("beginSession")}
          </button>
        </div>
      )}

      {/* ─────────────── RESPIRATION ─────────────── */}
      {step === "breathing" && (
        <div className="flex flex-1 flex-col px-6 pt-6 safe-top">
          <div className="flex items-center justify-between">
            <span className="font-display text-lg tabular-nums">
              {fmt(remaining)}
            </span>
            {confirmQuit ? (
              <span className="flex items-center gap-2 text-[12.5px]">
                {t("quitConfirm")}
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full bg-[#9A3B30] px-3 py-1 font-semibold text-white"
                >
                  {t("quitYes")}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmQuit(false)}
                  className="rounded-full px-2 py-1 text-warmgray dark:text-[#9A958B]"
                >
                  {t("quitNo")}
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmQuit(true)}
                className="rounded-full px-3 py-1.5 text-[13px] text-warmgray dark:text-[#9A958B]"
              >
                {t("quit")}
              </button>
            )}
          </div>

          <div className="flex flex-1 flex-col items-center justify-center">
            <div className="relative flex h-64 w-64 items-center justify-center">
              <span
                className="ca-breathe absolute inset-0 rounded-full bg-gold/20 dark:bg-gold-light/15"
                style={{
                  animation: `caBreathe ${CYCLE_SEC}s ease-in-out infinite`,
                }}
              />
              <span
                className="ca-breathe absolute inset-6 rounded-full bg-gold/25 dark:bg-gold-light/20"
                style={{
                  animation: `caBreathe ${CYCLE_SEC}s ease-in-out infinite`,
                }}
              />
              <span className="relative font-display text-xl text-gold-deep dark:text-gold-light">
                {inhaling ? t("breatheIn") : t("breatheOut")}
              </span>
            </div>
            <p className="mt-10 max-w-xs text-center font-display text-[17px] italic leading-snug">
              « {devotion.verse} »
            </p>
          </div>

          {confirmSkip && remaining > 0 ? (
            <div className="mb-8 flex flex-col items-center gap-3 rounded-btn border border-sand-200 py-4 dark:border-anthracite-600">
              <span className="px-4 text-center text-[13.5px] text-warmgray dark:text-[#9A958B]">
                {t("skipConfirm")}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep("reflection")}
                  className="rounded-full bg-navy px-4 py-1.5 text-[13px] font-semibold text-[#F4F1EA] dark:bg-gold-light dark:text-anthracite-900"
                >
                  {t("quitYes")}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmSkip(false)}
                  className="rounded-full px-3 py-1.5 text-[13px] text-warmgray dark:text-[#9A958B]"
                >
                  {t("quitNo")}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() =>
                remaining > 0 ? setConfirmSkip(true) : setStep("reflection")
              }
              className="mb-8 w-full rounded-btn border border-sand-200 py-3 text-[13.5px] font-medium text-warmgray dark:border-anthracite-600 dark:text-[#9A958B]"
            >
              {t("breatheDone")}
            </button>
          )}
        </div>
      )}

      {/* ─────────────── RÉFLEXION ─────────────── */}
      {step === "reflection" && (
        <div className="flex flex-1 flex-col px-6 pt-8 safe-top">
          <div className="flex-1">
            <span className="lbl text-[9px] text-gold-deep dark:text-gold-light">
              {t("reflection")}
            </span>
            <p className="mt-1 font-display text-[18px] italic leading-snug">
              {devotion.reflection}
            </p>
            <p className="mt-5 text-[13.5px] font-medium">
              {t("reflectionPrompt")}
            </p>
            <textarea
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              rows={6}
              aria-label={t("reflectionPrompt")}
              placeholder={t("reflectionPlaceholder")}
              className="mt-2 w-full rounded-card border border-sand-200 bg-surface p-3 text-[14px] leading-normal text-ink outline-none focus:border-gold dark:border-anthracite-600 dark:bg-anthracite-800 dark:text-[#ECE7DD]"
            />
            <p className="mt-2 flex items-center gap-1.5 text-[11.5px] text-warmgray dark:text-[#9A958B]">
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden
              >
                <path
                  d="M6 10V8a6 6 0 0 1 12 0v2M5 10h14v9H5z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
              </svg>
              {t("reflectionPrivate")}
            </p>
          </div>
          <button
            type="button"
            onClick={finish}
            disabled={saving}
            className="mb-3 w-full rounded-btnlg bg-navy py-4 text-base font-semibold text-[#F4F1EA] disabled:opacity-50 dark:bg-gold-light dark:text-anthracite-900"
          >
            {reflection.trim() ? t("reflectionSave") : t("reflectionSkip")}
          </button>
        </div>
      )}

      {/* ─────────────── CLÔTURE ─────────────── */}
      {step === "done" && (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center safe-top">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#EAF0EB] dark:bg-[#1B2A20]">
            <span className="text-2xl">🙏</span>
          </div>
          <h2 className="font-display text-2xl">{t("sessionDoneTitle")}</h2>
          <p className="mt-2 max-w-xs text-[14px] leading-relaxed text-[#4A463C] dark:text-[#B7B1A4]">
            {t("sessionDoneBody")}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-8 w-full max-w-xs rounded-btnlg bg-navy py-4 text-base font-semibold text-[#F4F1EA] dark:bg-gold-light dark:text-anthracite-900"
          >
            {t("sessionDoneCta")}
          </button>
        </div>
      )}
    </div>
  );
}
