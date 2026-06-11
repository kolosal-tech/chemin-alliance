"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

type Suggestion = { id: string; theme: string; text: string };
type Review = {
  alignedThemes: string[];
  openThemes: string[];
  myHighlights: Array<{ questionId: string; excerpt: string }>;
  narrative: string | null;
};

/** Agent 3 — sujets jamais abordés (déterministe, doctrine YAML). */
export function FacilitatorPanel({ matchId }: { matchId: string }) {
  const t = useTranslations("agents.facil");
  const [data, setData] = useState<{ themes: string[]; suggestions: Suggestion[] } | null>(null);

  useEffect(() => {
    fetch(`/api/agents/facilitator?matchId=${matchId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => {});
  }, [matchId]);

  if (!data) return null;
  return (
    <section className="mt-5">
      <h2 className="lbl mb-2.5 text-[9.5px] text-gold-deep dark:text-gold-light">{t("title")}</h2>
      {data.suggestions.length === 0 ? (
        <p className="rounded-btn bg-[#EAF0EB] px-3.5 py-2.5 text-[13px] text-[#2E5440] dark:bg-[#1B2A20] dark:text-[#9FC7AC]">
          {t("none")}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {data.suggestions.map((s) => (
            <div key={s.id} className="flex items-center gap-2.5 rounded-btn border border-dashed border-gold/50 bg-surface px-3.5 py-3 dark:border-gold-light/40 dark:bg-anthracite-800">
              <span className="lbl flex-none text-[8px] text-gold-deep dark:text-gold-light">{s.theme}</span>
              <span className="flex-1 font-display text-[13.5px] italic leading-snug text-[#3A372F] dark:text-[#CFCAC0]">
                {s.text}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/** Agent 4 — bilan d'étape privé. */
export function ReviewPanel({ matchId }: { matchId: string }) {
  const t = useTranslations("agents.review");
  const [review, setReview] = useState<Review | null>(null);
  const [busy, setBusy] = useState(false);

  async function generate() {
    setBusy(true);
    const res = await fetch("/api/agents/stage-review", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ matchId }),
    });
    setBusy(false);
    if (res.ok) setReview(await res.json());
  }

  return (
    <section className="mt-5">
      {!review ? (
        <button
          type="button"
          onClick={generate}
          disabled={busy}
          className="w-full rounded-btnsm border border-navy py-3 text-sm font-semibold text-navy disabled:opacity-60 dark:border-gold-light dark:text-gold-light"
        >
          {t("button")}
        </button>
      ) : (
        <div className="rounded-cardlg border border-sand-200 bg-surface p-4 dark:border-anthracite-600 dark:bg-anthracite-800">
          <div className="mb-1 flex items-baseline justify-between">
            <h3 className="font-display text-[18px] text-night dark:text-[#ECE7DD]">{t("title")}</h3>
            <span className="text-[10px] text-sand-500 dark:text-[#65625B]">{t("private")}</span>
          </div>
          {review.myHighlights.length === 0 ? (
            <p className="text-[13px] text-warmgray dark:text-[#9A958B]">{t("empty")}</p>
          ) : (
            <>
              <div className="mt-2 flex flex-col gap-2 text-[13px]">
                <div>
                  <span className="lbl text-[8.5px] text-sage">{t("aligned")}</span>
                  <p className="text-ink dark:text-[#CFCAC0]">{review.alignedThemes.join(" · ") || "—"}</p>
                </div>
                <div>
                  <span className="lbl text-[8.5px] text-amberink">{t("open")}</span>
                  <p className="text-ink dark:text-[#CFCAC0]">{review.openThemes.join(" · ") || "—"}</p>
                </div>
              </div>
              {review.narrative && (
                <p className="mt-3 border-t border-sand-100 pt-3 font-display text-[14px] italic leading-relaxed text-[#3A372F] dark:border-anthracite-700 dark:text-[#CFCAC0]">
                  {review.narrative}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
