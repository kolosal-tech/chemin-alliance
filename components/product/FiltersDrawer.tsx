"use client";

import { useId, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { AccessibleDialog } from "@/components/AccessibleDialog";

/**
 * Tiroir de filtres des suggestions (Deliverable 4).
 *
 * Les filtres sont portés par l'URL (?ageMin&ageMax&verified) : la
 * page serveur les valide via Zod (`lib/filters`) et filtre la liste. Ce
 * composant ne fait que produire ces searchParams - aucun appel réseau, aucune
 * mutation, donc aucune surface de rate-limit. Accessible : dialog, Échap,
 * fermeture au backdrop.
 */
export function FiltersDrawer({ activeCount }: { activeCount: number }) {
  const t = useTranslations("product.filters");
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [open, setOpen] = useState(false);
  const titleId = useId();

  const [ageMin, setAgeMin] = useState(sp.get("ageMin") ?? "");
  const [ageMax, setAgeMax] = useState(sp.get("ageMax") ?? "");
  const [verified, setVerified] = useState(sp.get("verified") === "1");

  function apply() {
    const q = new URLSearchParams();
    if (ageMin) q.set("ageMin", ageMin);
    if (ageMax) q.set("ageMax", ageMax);
    if (verified) q.set("verified", "1");
    const s = q.toString();
    router.push(s ? `${pathname}?${s}` : pathname);
    setOpen(false);
  }

  function reset() {
    setAgeMin("");
    setAgeMax("");
    setVerified(false);
    router.push(pathname);
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-btnsm border border-sand-300 bg-surface px-3.5 py-2 text-[16px] font-semibold text-night dark:border-anthracite-600 dark:bg-anthracite-800 dark:text-[#ECE7DD]"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M3 6h18M6 12h12M10 18h4"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
        {t("trigger")}
        {activeCount > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-navy px-1.5 text-[13px] font-bold text-[#F4F1EA] dark:bg-gold-light dark:text-anthracite-900">
            {activeCount}
          </span>
        )}
      </button>

      <AccessibleDialog
        open={open}
        onClose={() => setOpen(false)}
        labelledBy={titleId}
        overlayClassName="items-end p-0 sm:items-center sm:p-5"
        panelClassName="relative z-10 w-full max-w-md rounded-t-cardlg bg-surface p-6 shadow-cardfeat dark:bg-anthracite-800 sm:rounded-cardlg"
      >
        <div className="flex items-center justify-between">
          <h2
            id={titleId}
            className="font-display text-xl text-night dark:text-[#ECE7DD]"
          >
            {t("title")}
          </h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={t("close")}
            className="text-warmgray hover:text-night dark:text-[#9A958B] dark:hover:text-[#ECE7DD]"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
            >
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="mt-6 flex flex-col gap-6">
          <fieldset>
            <legend className="lbl text-[12px] text-gold-deep dark:text-gold-light">
              {t("age")}
            </legend>
            <div className="mt-3 flex items-center gap-3">
              <input
                type="number"
                inputMode="numeric"
                min={18}
                max={99}
                value={ageMin}
                onChange={(e) => setAgeMin(e.target.value)}
                placeholder={t("min")}
                aria-label={t("min")}
                className="w-full rounded-btnsm border border-sand-300 bg-canvas px-3 py-2.5 text-[17px] text-night dark:border-anthracite-600 dark:bg-anthracite-900 dark:text-[#ECE7DD]"
              />
              <span className="text-warmgray dark:text-[#9A958B]">-</span>
              <input
                type="number"
                inputMode="numeric"
                min={18}
                max={99}
                value={ageMax}
                onChange={(e) => setAgeMax(e.target.value)}
                placeholder={t("max")}
                aria-label={t("max")}
                className="w-full rounded-btnsm border border-sand-300 bg-canvas px-3 py-2.5 text-[17px] text-night dark:border-anthracite-600 dark:bg-anthracite-900 dark:text-[#ECE7DD]"
              />
            </div>
          </fieldset>

          <label className="flex items-center justify-between gap-3">
            <span className="text-[17px] text-night dark:text-[#ECE7DD]">
              {t("verifiedOnly")}
            </span>
            <input
              type="checkbox"
              checked={verified}
              onChange={(e) => setVerified(e.target.checked)}
              className="h-5 w-5 accent-navy dark:accent-gold-light"
            />
          </label>
        </div>

        <div className="mt-7 flex gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-btnsm border border-sand-400 px-4 py-3 text-[17px] font-medium text-[#6B665C] dark:border-anthracite-600 dark:text-[#9A958B]"
          >
            {t("reset")}
          </button>
          <button
            type="button"
            onClick={apply}
            className="flex-1 rounded-btnsm bg-navy py-3 text-[17px] font-semibold text-[#F4F1EA] dark:bg-gold-light dark:text-anthracite-900"
          >
            {t("apply")}
          </button>
        </div>
      </AccessibleDialog>
    </>
  );
}
