"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { SacredMotif } from "@/components/SacredMotif";
import { AsyncButton } from "@/components/AsyncButton";

type View = "loading" | "ready" | "done" | "answered" | "invalid";

export function BlessingForm({ token }: { token: string }) {
  const t = useTranslations("blessing");
  const [view, setView] = useState<View>("loading");
  const [filleul, setFilleul] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<"bless" | "caution" | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/blessing/${token}`)
      .then(async (r) => {
        if (!active) return;
        if (!r.ok) return setView("invalid");
        const d = (await r.json()) as { filleulName: string; status: string };
        setFilleul(d.filleulName);
        setView(d.status === "PENDING" ? "ready" : "answered");
      })
      .catch(() => {
        if (active) setView("invalid");
      });
    return () => {
      active = false;
    };
  }, [token]);

  async function respond(decision: "bless" | "caution") {
    setBusy(true);
    const r = await fetch(`/api/blessing/${token}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ decision, note: note.trim() || undefined }),
    });
    setBusy(false);
    if (r.ok) {
      setResult(decision);
      setView("done");
    } else if (r.status === 409) {
      setView("answered");
    } else {
      setView("invalid");
    }
  }

  const notice =
    "mt-5 rounded-card border border-[#CFE0D4] bg-[#EAF0EB] px-4 py-4 text-[14px] leading-relaxed text-[#2E5440] dark:border-[#2E4A38] dark:bg-[#1B2A20] dark:text-[#9FC7AC]";

  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center overflow-hidden px-7 safe-top safe-bottom">
      <SacredMotif variant="tree" className="right-[-110px] top-[-20px]" />
      <div className="mb-6 flex items-center gap-2.5">
        <span className="inline-block h-px w-[22px] bg-gold" aria-hidden />
        <span className="lbl text-[10px] text-gold-deep dark:text-gold-light">
          {t("eyebrow")}
        </span>
      </div>

      {view === "loading" && (
        <p className="text-sm text-warmgray dark:text-[#9A958B]">…</p>
      )}

      {view === "invalid" && <p className={notice}>{t("invalid")}</p>}

      {view === "answered" && <p className={notice}>{t("alreadyAnswered")}</p>}

      {view === "done" && (
        <div className={notice}>
          <p className="font-display text-[22px] leading-tight">
            {result === "bless" ? t("blessedDone") : t("cautionDone")}
          </p>
          <p className="mt-2 text-[13.5px] opacity-90">{t("thanks")}</p>
        </div>
      )}

      {view === "ready" && (
        <>
          <h1 className="font-display text-[30px] leading-tight text-night dark:text-[#ECE7DD]">
            {t("title", { name: filleul })}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-warmgray dark:text-[#9A958B]">
            {t("intro")}
          </p>

          <label className="mt-6 flex flex-col gap-1.5">
            <span className="lbl text-[9.5px] text-sand-600 dark:text-[#9A958B]">
              {t("noteLabel")}
            </span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder={t("notePlaceholder")}
              className="resize-none rounded-btnsm border border-sand-400 bg-white px-3.5 py-3 text-sm text-ink dark:border-anthracite-600 dark:bg-anthracite-700 dark:text-[#ECE7DD]"
            />
          </label>

          <div className="mt-6 flex flex-col gap-3">
            <AsyncButton
              onClick={() => respond("bless")}
              disabled={busy}
              pendingLabel={t("sending")}
              className="rounded-btnlg bg-gold px-4 py-4 text-base font-semibold text-[#131D33] disabled:opacity-60"
            >
              {t("bless")}
            </AsyncButton>
            <AsyncButton
              onClick={() => respond("caution")}
              disabled={busy}
              className="rounded-btnlg border border-sand-400 px-4 py-3.5 text-[15px] font-semibold text-warmgray disabled:opacity-60 dark:border-anthracite-600 dark:text-[#9A958B]"
            >
              {t("caution")}
            </AsyncButton>
          </div>
        </>
      )}
    </main>
  );
}
