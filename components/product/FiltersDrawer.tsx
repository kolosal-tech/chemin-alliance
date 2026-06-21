"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

/**
 * Tiroir de filtres des suggestions (Deliverable 4).
 *
 * Les filtres sont portés par l'URL (?ageMin&ageMax&verified&children) : la
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

  const [ageMin, setAgeMin] = useState(sp.get("ageMin") ?? "");
  const [ageMax, setAgeMax] = useState(sp.get("ageMax") ?? "");
  const [verified, setVerified] = useState(sp.get("verified") === "1");
  const [children, setChildren] = useState(sp.get("children") ?? "");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function apply() {
    const q = new URLSearchParams();
    if (ageMin) q.set("ageMin", ageMin);
    if (ageMax) q.set("ageMax", ageMax);
    if (verified) q.set("verified", "1");
    if (children) q.set("children", children);
    const s = q.toString();
    router.push(s ? `${pathname}?${s}` : pathname);
    setOpen(false);
  }

  function reset() {
    setAgeMin("");
    setAgeMax("");
    setVerified(false);
    setChildren("");
    router.push(pathname);
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-btnsm border border-sand-300 bg-surface px-3.5 py-2 text-[13px] font-semibold text-night dark:border-anthracite-600 dark:bg-anthracite-800 dark:text-[#ECE7DD]"
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
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-navy px-1.5 text-[11px] font-bold text-[#F4F1EA] dark:bg-gold-light dark:text-anthracite-900">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("title")}
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
        >
          <button
            type="button"
            aria-label={t("close")}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-night/40 backdrop-blur-sm"
          />
          <div className="relative z-10 w-full max-w-md rounded-t-cardlg bg-surface p-6 shadow-cardfeat dark:bg-anthracite-800 sm:rounded-cardlg">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl text-night dark:text-[#ECE7DD]">
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
                <legend className="lbl text-[10px] text-gold-deep dark:text-gold-light">
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
                    className="w-full rounded-btnsm border border-sand-300 bg-canvas px-3 py-2.5 text-[14px] text-night dark:border-anthracite-600 dark:bg-anthracite-900 dark:text-[#ECE7DD]"
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
                    className="w-full rounded-btnsm border border-sand-300 bg-canvas px-3 py-2.5 text-[14px] text-night dark:border-anthracite-600 dark:bg-anthracite-900 dark:text-[#ECE7DD]"
                  />
                </div>
              </fieldset>

              <label className="flex items-center justify-between gap-3">
                <span className="text-[14px] text-night dark:text-[#ECE7DD]">
                  {t("verifiedOnly")}
                </span>
                <input
                  type="checkbox"
                  checked={verified}
                  onChange={(e) => setVerified(e.target.checked)}
                  className="h-5 w-5 accent-navy dark:accent-gold-light"
                />
              </label>

              <fieldset>
                <legend className="lbl text-[10px] text-gold-deep dark:text-gold-light">
                  {t("children")}
                </legend>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {(["", "yes", "no"] as const).map((value) => (
                    <button
                      key={value || "any"}
                      type="button"
                      onClick={() => setChildren(value)}
                      aria-pressed={children === value}
                      className={`rounded-btnsm border px-3 py-2.5 text-[13px] font-semibold transition-colors ${
                        children === value
                          ? "border-navy bg-navy text-[#F4F1EA] dark:border-gold-light dark:bg-gold-light dark:text-anthracite-900"
                          : "border-sand-300 text-warmgray dark:border-anthracite-600 dark:text-[#9A958B]"
                      }`}
                    >
                      {t(
                        value === ""
                          ? "childrenAny"
                          : value === "yes"
                            ? "childrenYes"
                            : "childrenNo",
                      )}
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>

            <div className="mt-7 flex gap-3">
              <button
                type="button"
                onClick={reset}
                className="rounded-btnsm border border-sand-400 px-4 py-3 text-[14px] font-medium text-[#6B665C] dark:border-anthracite-600 dark:text-[#9A958B]"
              >
                {t("reset")}
              </button>
              <button
                type="button"
                onClick={apply}
                className="flex-1 rounded-btnsm bg-navy py-3 text-[14px] font-semibold text-[#F4F1EA] dark:bg-gold-light dark:text-anthracite-900"
              >
                {t("apply")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
