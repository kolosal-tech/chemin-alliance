"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Icon } from "@/components/marketing/icons";
import type { ProfileCompletion } from "@/lib/profile-completion";

/**
 * Modale « profil incomplet » - nudge bref façon Duolingo. S'affiche au montage
 * (la page Suggestions ne la rend que si le gate Phase 2 est ON et le profil
 * incomplet), refermable (« Plus tard »). Esc + clic backdrop = fermer.
 */
export function IncompleteProfileModal({
  completion,
}: {
  completion: ProfileCompletion;
}) {
  const t = useTranslations("phase2.modal");
  const [open, setOpen] = useState(true);
  const titleId = useId();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Focus initial dans la modale + piège Tab/Shift+Tab + restauration du
  // focus au démontage. La gestion d'Echap reste dans l'effet ci-dessus
  // (ne pas dupliquer) ; celui-ci ne gère que Tab.
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const node = ref.current;
    const getFocusable = () =>
      Array.from(
        node?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
    getFocusable()[0]?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      const items = getFocusable();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previouslyFocused?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-end justify-center bg-night/50 p-4 backdrop-blur-sm sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div
        ref={ref}
        className="w-full max-w-sm rounded-cardlg border border-sand-200 bg-surface p-6 shadow-phone dark:border-anthracite-600 dark:bg-anthracite-800"
      >
        <div className="flex items-start gap-4">
          <span
            aria-hidden
            className="flex h-12 w-12 flex-none items-center justify-center rounded-card bg-gold/15 text-gold-deep dark:text-gold-light"
          >
            <Icon name="sparkle" className="h-6 w-6" strokeWidth={1.7} />
          </span>
          <div className="flex-1">
            <h2
              id={titleId}
              className="font-display text-xl text-night dark:text-[#ECE7DD]"
            >
              {t("title")}
            </h2>
            <p className="mt-1.5 text-[17px] leading-relaxed text-warmgray dark:text-[#9A958B]">
              {t("body")}
            </p>
          </div>
        </div>

        {/* Mini-jauge */}
        <div className="mt-5">
          <div className="mb-1.5 flex justify-between text-[15px] font-semibold text-warmgray dark:text-[#9A958B]">
            <span>
              {completion.done}/{completion.total}
            </span>
            <span>{completion.percent}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-sand-200 dark:bg-anthracite-700">
            <div
              className="h-full rounded-full bg-gradient-to-r from-gold to-gold-deep dark:from-gold-light dark:to-gold"
              style={{ width: `${completion.percent}%` }}
            />
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2.5">
          <Link
            href="/profile/edit"
            className="inline-flex items-center justify-center gap-1.5 rounded-btn bg-navy px-5 py-3.5 text-[17px] font-semibold text-[#F4F1EA] transition-colors hover:bg-night dark:bg-gold-light dark:text-anthracite-900 dark:hover:bg-gold"
          >
            {t("cta")}
            <Icon name="arrowRight" className="h-4 w-4" strokeWidth={1.9} />
          </Link>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-btn px-5 py-3 text-[17px] font-semibold text-warmgray transition-colors hover:text-night dark:text-[#9A958B] dark:hover:text-[#ECE7DD]"
          >
            {t("later")}
          </button>
        </div>
      </div>
    </div>
  );
}
