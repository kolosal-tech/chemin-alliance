import { useTranslations } from "next-intl";
import type { VisibilityLevel } from "@prisma/client";

const LEVEL_DOTS: Record<VisibilityLevel, number> = {
  PUBLIC_CONTROLLED: 1,
  AFTER_MATCH: 2,
  AFTER_DIALOGUE: 3,
  AFTER_DISCERNMENT: 4,
  COACH_ONLY: 5,
  PRIVATE: 5,
  MANUAL_SHARE: 4,
};

const LEVEL_COLOR: Record<VisibilityLevel, string> = {
  PUBLIC_CONTROLLED: "text-sage",
  AFTER_MATCH: "text-gold-deep",
  AFTER_DIALOGUE: "text-amberink",
  AFTER_DISCERNMENT: "text-navy dark:text-info-darkInk",
  COACH_ONLY: "text-navy dark:text-info-darkInk",
  PRIVATE: "text-navy dark:text-info-darkInk",
  MANUAL_SHARE: "text-warmgray dark:text-sage-darkInk",
};

/** Cadenas 5 niveaux - indicateur de visibilité par champ. */
export function LockBadge({ level }: { level: VisibilityLevel }) {
  const t = useTranslations("visibility");
  const dots = LEVEL_DOTS[level];
  const open = level === "PUBLIC_CONTROLLED";
  return (
    <span
      title={t(level)}
      className={`inline-flex items-center gap-1 rounded-[8px] border border-sand-300 bg-sand-100 px-1.5 py-1 dark:border-anthracite-600 dark:bg-anthracite-700 ${LEVEL_COLOR[level]}`}
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect
          x="5"
          y="11"
          width="14"
          height="9"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.9"
        />
        {open ? (
          <path
            d="M8 11V8a4 4 0 0 1 7-2.6"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
          />
        ) : (
          <path
            d="M8 11V8a4 4 0 0 1 8 0v3"
            stroke="currentColor"
            strokeWidth="1.9"
          />
        )}
      </svg>
      <span className="flex gap-[2px]" aria-hidden>
        {[1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            className={`h-[4px] w-[4px] rounded-full ${i <= dots ? "bg-current" : "bg-sand-300 dark:bg-anthracite-600"}`}
          />
        ))}
      </span>
      <span className="lbl text-[8px]">{t(level)}</span>
    </span>
  );
}
