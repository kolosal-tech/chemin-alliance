"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SacredMotif } from "@/components/SacredMotif";

type Entry = { id: number; role: "user" | "coach"; text: string; guardrail?: boolean };

export function CoachChat() {
  const t = useTranslations();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [quota, setQuota] = useState<number | null>(null);
  const [mode, setMode] = useState<"individual" | "couple">("individual");

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    const q = draft.trim();
    if (!q || busy) return;
    setBusy(true);
    setEntries((s) => [...s, { id: Date.now(), role: "user", text: q }]);
    setDraft("");
    const res = await fetch("/api/ai-coach/message", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ question: q }),
    });
    setBusy(false);
    const data = await res.json();
    if (data.quotaExceeded) {
      setQuota(data.limit);
      return;
    }
    if (data.text) {
      setEntries((s) => [
        ...s,
        { id: Date.now() + 1, role: "coach", text: data.text, guardrail: data.guardrail },
      ]);
    }
  }

  return (
    <div className="fixed inset-0 z-30 mx-auto flex w-full max-w-md flex-col bg-cream dark:bg-anthracite-900 lg:left-60 lg:max-w-2xl">
      <SacredMotif variant="flame" className="right-[-90px] top-[160px]" />
      <header className="glass safe-top sticky top-0 z-30 border-b border-sand-200/50 px-4 pb-3 pt-3 dark:border-anthracite-600/50">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-night dark:bg-gold-light">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M12 3l1.8 4.7L18.5 9l-4.7 1.8L12 15l-1.8-4.2L5.5 9l4.7-1.3L12 3Z" className="fill-gold dark:fill-anthracite-900" />
            </svg>
          </div>
          <div>
            <div className="font-display text-lg text-night dark:text-[#ECE7DD]">
              {t("aiCoach.title")}
            </div>
            <div className="text-[11px] text-sand-600 dark:text-[#7E7A72]">
              {t("aiCoach.subtitle")}
            </div>
          </div>
        </div>
        <div className="flex rounded-btnsm bg-sand-100 p-[3px] dark:bg-anthracite-700" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "individual"}
            onClick={() => setMode("individual")}
            className={`flex-1 rounded-[8px] py-1.5 text-[12.5px] font-semibold ${
              mode === "individual"
                ? "bg-surface text-night shadow-sm dark:bg-anthracite-600 dark:text-[#ECE7DD]"
                : "text-sand-600 dark:text-[#7E7A72]"
            }`}
          >
            {t("aiCoach.modeIndividual")}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "couple"}
            onClick={() => setMode("couple")}
            className={`flex-1 rounded-[8px] py-1.5 text-[12.5px] font-medium ${
              mode === "couple"
                ? "bg-surface text-night shadow-sm dark:bg-anthracite-600 dark:text-[#ECE7DD]"
                : "text-sand-600 dark:text-[#7E7A72]"
            }`}
          >
            {t("aiCoach.modeCouple")}{" "}
            <span className="text-[9px]">· {t("aiCoach.modeCoupleHint")}</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
        {/* Bandeau de transparence — obligatoire */}
        <div className="glass glass-bubble rounded-[13px] border-[#D4DAE4]/70 bg-[#EAEDF2]/70 px-4 py-3 dark:border-[#2A3A56]/70 dark:bg-[#1A2233]/60" role="note">
          <div className="flex gap-2.5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="mt-0.5 flex-none text-navy dark:text-[#8FA6D0]" aria-hidden>
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
              <path d="M12 11v5M12 8h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <p className="text-[12.5px] leading-normal text-[#2A3550] dark:text-[#B9C6E0]">
              {t("common.aiTransparency")}
            </p>
          </div>
        </div>

        {entries.map((e) =>
          e.role === "user" ? (
            <div key={e.id} className="glass-self glass-bubble max-w-[80%] self-end rounded-[14px] rounded-tr-[4px] px-3.5 py-2.5">
              <p className="text-[13.5px] leading-normal text-[#EDEFF3]">{e.text}</p>
            </div>
          ) : e.guardrail ? (
            <div key={e.id} className="max-w-[90%] self-start rounded-[14px] border border-[#EAD9A8] bg-[#FBF6E9] p-3.5 dark:border-[#463A1F] dark:bg-[#272117]">
              <div className="mb-2 flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M12 3l9 16H3L12 3Z" stroke="#9A7B2E" strokeWidth="1.6" strokeLinejoin="round" />
                  <path d="M12 10v4M12 16.5h.01" stroke="#9A7B2E" strokeWidth="1.7" strokeLinecap="round" />
                </svg>
                <span className="text-[12.5px] font-semibold text-gold-ink dark:text-[#E0C77A]">
                  {t("aiCoach.guardrailTitle")}
                </span>
              </div>
              <p className="mb-2.5 text-[12.5px] leading-normal text-[#6F5C2E] dark:text-[#C2B488]">
                {e.text}
              </p>
              <Link
                href="/coaches"
                className="block w-full rounded-[10px] border border-gold bg-white py-2.5 text-center text-[13px] font-semibold text-gold-ink dark:border-[#6A5A2E] dark:bg-anthracite-800 dark:text-[#E0C77A]"
              >
                {t("aiCoach.guardrailCta")}
              </Link>
            </div>
          ) : (
            <div key={e.id} className="flex max-w-[88%] gap-2.5 self-start">
              <div className="mt-0.5 flex h-[26px] w-[26px] flex-none items-center justify-center rounded-[8px] bg-night dark:bg-gold-light">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M12 3l1.8 4.7L18.5 9l-4.7 1.8L12 15l-1.8-4.2L5.5 9l4.7-1.3L12 3Z" className="fill-gold dark:fill-anthracite-900" />
                </svg>
              </div>
              <div className="glass glass-bubble rounded-[14px] rounded-tl-[4px] px-3.5 py-2.5">
                <p className="text-[13.5px] leading-normal text-[#2A2823] dark:text-[#CFCAC0]">
                  {e.text}
                </p>
              </div>
            </div>
          ),
        )}

        {quota !== null && (
          <p role="status" className="rounded-[13px] border border-[#EAD9A8] bg-[#FBF6E9] px-4 py-3 text-[12.5px] text-[#6F5C2E] dark:border-[#463A1F] dark:bg-[#272117] dark:text-[#C2B488]">
            {t("aiCoach.quotaReached", { limit: quota })}
          </p>
        )}
      </div>

      <div className="glass sticky bottom-0 z-30 border-t border-sand-200/50 px-3.5 pb-[calc(env(safe-area-inset-bottom)+88px)] lg:pb-4 pt-3 dark:border-anthracite-600/50">
        <form onSubmit={ask} className="glass flex items-center gap-2 rounded-[24px] border border-sand-300 py-1.5 pl-4 pr-1.5 dark:border-anthracite-600 dark:bg-anthracite-800/80">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t("aiCoach.placeholder")}
            aria-label={t("aiCoach.placeholder")}
            className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-sand-500 dark:text-[#ECE7DD] dark:placeholder:text-[#65625B]"
          />
          <button
            type="submit"
            disabled={busy || !draft.trim()}
            aria-label={t("messaging.send")}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-navy disabled:opacity-50 dark:bg-gold-light"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M5 12h13M12 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-[#F4F1EA] dark:text-anthracite-900" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
