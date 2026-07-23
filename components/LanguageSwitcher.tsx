"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";

const LABELS: Record<string, string> = {
  fr: "Français",
  en: "English",
  es: "Español",
  pt: "Português",
};

// Code court affiché dans le déclencheur compact (raccourci d'en-tête).
const SHORT: Record<string, string> = {
  fr: "FR",
  en: "EN",
  es: "ES",
  pt: "PT",
};

export function LanguageSwitcher() {
  const locale = useLocale();
  const t = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const pendingFocusIndex = useRef<number | null>(null);
  const menuId = useId();
  const codes = Object.keys(LABELS);
  const activeIndex = Math.max(0, codes.indexOf(locale));

  function openAt(index: number) {
    pendingFocusIndex.current = index;
    setOpen(true);
  }

  // Fermeture au clic extérieur et à la touche Echap : un panneau compact qui
  // ne reste jamais coincé ouvert, contrairement au menu natif surdimensionne.
  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open || pendingFocusIndex.current === null) return;
    itemRefs.current[pendingFocusIndex.current]?.focus();
    pendingFocusIndex.current = null;
  }, [open]);

  function choose(code: string) {
    setOpen(false);
    if (code !== locale) {
      router.replace(pathname, { locale: code });
    } else {
      triggerRef.current?.focus();
    }
  }

  function moveFocus(nextIndex: number) {
    const normalized = (nextIndex + codes.length) % codes.length;
    itemRefs.current[normalized]?.focus();
  }

  return (
    <div ref={ref} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? setOpen(false) : openAt(activeIndex))}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            openAt(
              event.key === "ArrowDown"
                ? activeIndex
                : (activeIndex - 1 + codes.length) % codes.length,
            );
          }
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={t("language")}
        className="inline-flex items-center gap-1.5 rounded-xl border border-sand-300 bg-surface px-2.5 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-sand-400 dark:border-anthracite-600 dark:bg-anthracite-700 dark:text-[#ECE7DD] dark:hover:border-[#3A3D44]"
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
          className="text-gold-deep dark:text-gold-light"
        >
          <circle
            cx="12"
            cy="12"
            r="9"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <path
            d="M3 12h18M12 3c2.6 2.6 2.6 15.4 0 18M12 3c-2.6 2.6-2.6 15.4 0 18"
            stroke="currentColor"
            strokeWidth="1.6"
          />
        </svg>
        {SHORT[locale] ?? locale.toUpperCase()}
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <path
            d="M6 9l6 6 6-6"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <ul
          id={menuId}
          role="menu"
          aria-label={t("language")}
          onKeyDown={(event) => {
            const currentIndex = itemRefs.current.indexOf(
              document.activeElement as HTMLButtonElement,
            );
            if (event.key === "ArrowDown") {
              event.preventDefault();
              moveFocus(currentIndex + 1);
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              moveFocus(currentIndex - 1);
            } else if (event.key === "Home") {
              event.preventDefault();
              moveFocus(0);
            } else if (event.key === "End") {
              event.preventDefault();
              moveFocus(codes.length - 1);
            } else if (event.key === "Tab") {
              setOpen(false);
            }
          }}
          className="absolute right-0 z-50 mt-1.5 w-40 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-xl border border-sand-200 bg-surface py-1 shadow-cardfeat dark:border-anthracite-600 dark:bg-anthracite-800"
        >
          {Object.entries(LABELS).map(([code, label], index) => {
            const active = code === locale;
            return (
              <li key={code}>
                <button
                  ref={(node) => {
                    itemRefs.current[index] = node;
                  }}
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  tabIndex={index === activeIndex ? 0 : -1}
                  onClick={() => choose(code)}
                  className={`flex w-full items-center justify-between px-3 py-2 text-sm transition-colors ${
                    active
                      ? "font-semibold text-gold-ink dark:text-gold-light"
                      : "text-ink hover:bg-sand-100 dark:text-[#CFCAC0] dark:hover:bg-anthracite-700"
                  }`}
                >
                  {label}
                  {active && (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden
                    >
                      <path
                        d="M5 12.5l4 4 10-10.5"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
