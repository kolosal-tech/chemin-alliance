"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

/**
 * Bloquer une personne — GRATUIT À VIE, jamais derrière un paywall.
 * Confirmation douce, aucune raison demandée. Après blocage, retour à la liste
 * des messages (la conversation disparaît des deux côtés).
 *
 * Le modal est rendu via un PORTAIL vers document.body : l'en-tête de la
 * conversation porte `.glass` (backdrop-filter), qui crée un bloc de
 * confinement pour `position: fixed` — sans portail, le modal se rognerait
 * dans l'en-tête au lieu de couvrir l'écran.
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
        className="flex h-9 w-9 flex-none items-center justify-center rounded-full border border-sand-300 text-warmgray transition-colors hover:border-danger/50 hover:text-danger dark:border-anthracite-600 dark:text-[#9A958B]"
      >
        {/* Personne bloquée (et non un panneau d'interdiction). */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle
            cx="10"
            cy="8"
            r="3.3"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <path
            d="M4 19.3c0-3.2 2.7-5.3 6-5.3 1.1 0 2.2.3 3 .7"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d="M16 15l4 4m0-4l-4 4"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-night/50 p-5 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          >
            <div
              className="w-full max-w-sm rounded-cardlg border border-sand-200 bg-cream p-5 shadow-[0_20px_60px_-15px_rgba(19,29,51,0.5)] dark:border-anthracite-600 dark:bg-anthracite-850"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-display text-[18px] text-night dark:text-[#ECE7DD]">
                {t("confirmTitle", { name: targetName })}
              </h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-warmgray dark:text-[#9A958B]">
                {t("confirmBody")}
              </p>
              <p className="mt-2 text-[11.5px] text-sage">{t("free")}</p>
              <div className="mt-5 flex gap-2.5">
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
          </div>,
          document.body,
        )}
    </>
  );
}
