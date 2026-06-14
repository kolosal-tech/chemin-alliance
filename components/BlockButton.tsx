"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

/**
 * Bloquer une personne — GRATUIT À VIE, jamais derrière un paywall.
 * Confirmation douce, aucune raison demandée. Après blocage, retour à la liste
 * des messages (la conversation disparaît des deux côtés).
 */
export function BlockButton({
  targetUserId,
  targetName,
}: {
  targetUserId: string;
  targetName: string;
}) {
  const t = useTranslations("block");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function block() {
    setBusy(true);
    await fetch("/api/blocks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ targetUserId }),
    });
    setBusy(false);
    setOpen(false);
    router.push("/messages");
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("block")}
        className="rounded-btn p-2 text-warmgray hover:text-danger dark:text-[#9A958B]"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
          <path d="M5.6 5.6l12.8 12.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-cardlg border border-sand-200 bg-cream p-5 dark:border-anthracite-600 dark:bg-anthracite-850"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-[18px] text-night dark:text-[#ECE7DD]">
              {t("confirmTitle", { name: targetName })}
            </h3>
            <p className="mt-2 text-[13.5px] leading-relaxed text-warmgray dark:text-[#9A958B]">
              {t("confirmBody")}
            </p>
            <p className="mt-2 text-[11.5px] text-sage">{t("free")}</p>
            <div className="mt-4 flex gap-2.5">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 rounded-btnsm border border-sand-400 py-3 text-[13px] font-medium text-warmgray dark:border-anthracite-600 dark:text-[#9A958B]"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={block}
                disabled={busy}
                className="flex-1 rounded-btnsm bg-danger py-3 text-[13px] font-semibold text-white disabled:opacity-50"
              >
                {t("confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
