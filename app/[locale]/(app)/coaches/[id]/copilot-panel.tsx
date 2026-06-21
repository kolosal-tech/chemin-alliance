"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AsyncButton } from "@/components/AsyncButton";

/**
 * Agent 7 - Copilote du Coach. Double consentement strict :
 * le résumé n'est généré que si les deux membres ont consenti.
 */
export function CopilotPanel({
  matchId,
  otherName,
}: {
  matchId: string;
  otherName: string;
}) {
  const t = useTranslations("agents.copilot");
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<"idle" | "waiting" | "done">("idle");
  const [summary, setSummary] = useState<string | null>(null);

  async function generate() {
    const res = await fetch("/api/agents/coach-copilot", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ matchId, consent: true }),
    });
    if (!res.ok) return;
    const d = await res.json();
    if (d.bothConsented) {
      setSummary(d.summary);
      setState("done");
    } else {
      setState("waiting");
    }
  }

  return (
    <section className="mb-6 rounded-cardlg border border-sand-200 bg-surface p-4 dark:border-anthracite-600 dark:bg-anthracite-800">
      <h2 className="font-display text-[18px] text-night dark:text-[#ECE7DD]">
        {t("title")}
      </h2>
      <p className="mt-1 text-[12.5px] leading-snug text-warmgray dark:text-[#9A958B]">
        {t("desc")}
      </p>
      <p className="lbl mt-2 text-[8.5px] text-sand-600 dark:text-[#7E7A72]">
        {t("matchLabel")} · {otherName}
      </p>
      {state === "idle" && (
        <>
          <label className="mt-3 flex items-start gap-2.5 text-[12.5px] text-warmgray dark:text-[#9A958B]">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[#1A2744]"
            />
            <span>{t("consentLabel")}</span>
          </label>
          <AsyncButton
            disabled={!consent}
            onClick={generate}
            className="mt-3 w-full rounded-btnsm border border-navy py-3 text-sm font-semibold text-navy disabled:opacity-50 dark:border-gold-light dark:text-gold-light"
          >
            {t("generate")}
          </AsyncButton>
        </>
      )}
      {state === "waiting" && (
        <p
          role="status"
          className="mt-3 rounded-btn bg-[#EAEDF2] px-3.5 py-2.5 text-[13px] text-[#2A3550] dark:bg-[#1A2233] dark:text-[#B9C6E0]"
        >
          {t("waitingOther")}
        </p>
      )}
      {state === "done" && summary && (
        <div className="mt-3">
          <span className="lbl text-[8.5px] text-gold-deep dark:text-gold-light">
            {t("summaryTitle")}
          </span>
          <pre className="mt-1.5 whitespace-pre-wrap rounded-btn bg-sand-100 p-3.5 font-sans text-[12.5px] leading-relaxed text-ink dark:bg-anthracite-700 dark:text-[#CFCAC0]">
            {summary}
          </pre>
        </div>
      )}
    </section>
  );
}
