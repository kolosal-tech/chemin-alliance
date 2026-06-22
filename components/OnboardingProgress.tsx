"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Icon } from "@/components/marketing/icons";
import type { ProfileCompletion } from "@/lib/profile-completion";

/**
 * Jauge d'onboarding façon Duolingo : anneau de progression animé +
 * checklist des sections. Présentationnel et pur (données via `completion`).
 * Le ring s'anime de 0 → percent au montage (reduced-motion géré globalement
 * par globals.css).
 */
export function OnboardingProgress({
  completion,
  className = "",
}: {
  completion: ProfileCompletion;
  className?: string;
}) {
  const t = useTranslations("phase2.progress");
  const { percent, sections, missing, isComplete } = completion;

  // Animation de remplissage au montage.
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(percent));
    return () => cancelAnimationFrame(id);
  }, [percent]);

  const R = 52;
  const C = 2 * Math.PI * R;
  const offset = C * (1 - shown / 100);

  return (
    <section
      className={`rounded-cardlg border border-sand-200 bg-surface p-6 dark:border-anthracite-600 dark:bg-anthracite-800 sm:p-7 ${className}`}
    >
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-7">
        {/* Anneau */}
        <div className="relative flex-none" style={{ width: 132, height: 132 }}>
          <svg
            width="132"
            height="132"
            viewBox="0 0 132 132"
            className="-rotate-90"
          >
            <circle
              cx="66"
              cy="66"
              r={R}
              fill="none"
              strokeWidth="11"
              className="stroke-sand-200 dark:stroke-anthracite-700"
            />
            <circle
              cx="66"
              cy="66"
              r={R}
              fill="none"
              strokeWidth="11"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={offset}
              className="stroke-gold transition-[stroke-dashoffset] duration-700 ease-out dark:stroke-gold-light"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-3xl font-medium text-night dark:text-[#ECE7DD]">
              {percent}%
            </span>
            <span className="lbl text-[9.5px] text-sand-600 dark:text-[#7E7A72]">
              {t("percentLabel")}
            </span>
          </div>
        </div>

        {/* Titre + sous-titre + CTA */}
        <div className="flex-1 text-center sm:text-left">
          <h2 className="font-display text-2xl text-night dark:text-[#ECE7DD]">
            {t("title")}
          </h2>
          <p className="mt-1.5 text-[15px] text-warmgray dark:text-[#9A958B]">
            {isComplete
              ? t("subtitleComplete")
              : t("subtitleRemaining", { count: missing.length })}
          </p>
          {!isComplete && (
            <Link
              href="/profile/edit"
              className="mt-4 inline-flex items-center gap-1.5 rounded-btn bg-navy px-5 py-3 text-[15px] font-semibold text-[#F4F1EA] transition-colors hover:bg-night dark:bg-gold-light dark:text-anthracite-900 dark:hover:bg-gold"
            >
              {t("cta")}
              <Icon name="arrowRight" className="h-4 w-4" strokeWidth={1.9} />
            </Link>
          )}
        </div>
      </div>

      {/* Checklist */}
      <ul className="mt-6 grid gap-2.5 border-t border-sand-200 pt-5 dark:border-anthracite-700 sm:grid-cols-2">
        {sections.map((s) => (
          <li key={s.id} className="flex items-center gap-2.5 text-[15px]">
            <span
              aria-hidden
              className={`flex h-6 w-6 flex-none items-center justify-center rounded-full transition-colors ${
                s.done
                  ? "bg-sage/15 text-sage dark:bg-sage/25"
                  : "border border-sand-400 text-transparent dark:border-anthracite-600"
              }`}
            >
              <Icon name="check" className="h-3.5 w-3.5" strokeWidth={2.4} />
            </span>
            <span
              className={
                s.done
                  ? "text-night line-through decoration-sand-400 dark:text-[#9A958B]"
                  : "text-night dark:text-[#ECE7DD]"
              }
            >
              {t(`sections.${s.id}`)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
