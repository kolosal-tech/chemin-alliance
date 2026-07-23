"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { AsyncButton } from "@/components/AsyncButton";
import { AccessibleDialog } from "@/components/AccessibleDialog";
import { useToast } from "@/components/Toast";

/**
 * Signaler une personne - GRATUIT À VIE, jamais derrière un paywall (invariant
 * doctrinal). Demande une courte description, confidentielle. Modal via portail
 * vers document.body (l'en-tête de conversation porte `.glass` = bloc de
 * confinement pour position:fixed).
 */
export function ReportButton({ targetUserId }: { targetUserId: string }) {
  const t = useTranslations("reports");
  const tc = useTranslations("common");
  const toast = useToast();
  const titleId = useId();
  const descriptionId = useId();
  const reasonId = useId();
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    if (reason.trim().length < 10 || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ targetUserId, reason: reason.trim() }),
      });
      if (!res.ok) throw new Error("report_failed");
      setDone(true);
    } catch {
      toast.error(t("error"));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!done) return;
    const timer = window.setTimeout(() => {
      setOpen(false);
      setDone(false);
      setReason("");
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [done]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("report")}
        className="flex h-9 w-9 flex-none items-center justify-center rounded-full border border-sand-300 text-warmgray transition-colors hover:border-danger/50 hover:text-danger dark:border-anthracite-600 dark:text-[#9A958B]"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M5 21V4m0 1.5h9l-1.2 3 1.2 3H5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <AccessibleDialog
        open={open}
        onClose={() => setOpen(false)}
        closeDisabled={busy}
        labelledBy={titleId}
        describedBy={descriptionId}
        initialFocusRef={reasonRef}
        panelClassName="w-full max-w-sm rounded-cardlg border border-sand-200 bg-cream p-5 shadow-[0_20px_60px_-15px_rgba(19,29,51,0.5)] dark:border-anthracite-600 dark:bg-anthracite-850"
      >
        <h3
          id={titleId}
          className="font-display text-[21px] text-night dark:text-[#ECE7DD]"
        >
          {t("title")}
        </h3>
        <p id={descriptionId} className="sr-only">
          {t("description")}
        </p>
        {done ? (
          <p
            role="status"
            className="py-3 text-center text-[16px] leading-relaxed text-sage"
          >
            {t("done")}
          </p>
        ) : (
          <>
            <label htmlFor={reasonId} className="sr-only">
              {t("reasonLabel")}
            </label>
            <textarea
              ref={reasonRef}
              id={reasonId}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("reasonPlaceholder")}
              rows={4}
              maxLength={2000}
              className="mt-3 w-full resize-y rounded-btnsm border border-sand-300 bg-surface px-3 py-2.5 text-sm leading-relaxed text-ink dark:border-anthracite-600 dark:bg-anthracite-700 dark:text-[#ECE7DD]"
            />
            <div className="mt-4 flex gap-2.5">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={busy}
                className="flex-1 rounded-btnsm border border-sand-400 py-3 text-[16px] font-medium text-warmgray disabled:opacity-50 dark:border-anthracite-600 dark:text-[#9A958B]"
              >
                {tc("cancel")}
              </button>
              <AsyncButton
                onClick={submit}
                disabled={busy || reason.trim().length < 10}
                className="flex-1 rounded-btnsm bg-danger py-3 text-[16px] font-semibold text-white disabled:opacity-50"
              >
                {t("submit")}
              </AsyncButton>
            </div>
          </>
        )}
      </AccessibleDialog>
    </>
  );
}
