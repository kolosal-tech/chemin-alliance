"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Icon } from "./icons";

/** Wordmark - pas de logo image ; glyph dans pastille + nom. */
function Wordmark() {
  return (
    <Link
      href="/"
      className="flex items-center gap-2.5 font-display text-[20px] font-semibold text-night dark:text-[#ECE7DD]"
    >
      <span
        aria-hidden
        className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-navy text-[#F4F1EA] shadow-sm dark:bg-gold-light dark:text-anthracite-900"
      >
        <Icon name="ring" className="h-5 w-5" strokeWidth={1.7} />
      </span>
      Chemin d&apos;Alliance
    </Link>
  );
}

const navLinks = [
  { href: "/#why", key: "features" },
  { href: "/#journey", key: "journey" },
  { href: "/#testimonials", key: "testimonials" },
] as const;

export function MarketingHeader() {
  const t = useTranslations("home.nav");
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-sand-300/70 bg-canvas/85 backdrop-blur-md safe-top dark:border-anthracite-700/70 dark:bg-anthracite-900/85">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-6">
        <Wordmark />

        {/* Liens - desktop */}
        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((l) => (
            <a
              key={l.key}
              href={l.href}
              className="rounded-btnsm px-3 py-2 text-sm font-medium text-warmgray transition-colors hover:text-night dark:text-[#9A958B] dark:hover:text-[#ECE7DD]"
            >
              {t(l.key)}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-1 sm:flex">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
          <Link
            href="/login"
            className="hidden rounded-btn px-3.5 py-2 text-sm font-semibold text-navy transition-colors hover:bg-navy/5 sm:inline-block dark:text-gold-light dark:hover:bg-white/5"
          >
            {t("login")}
          </Link>
          <Link
            href="/bienvenue"
            className="hidden rounded-btn bg-navy px-4 py-2.5 text-sm font-semibold text-[#F4F1EA] transition-colors hover:bg-night sm:inline-block dark:bg-gold-light dark:text-anthracite-900 dark:hover:bg-gold"
          >
            {t("start")}
          </Link>

          {/* Burger - mobile */}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label={open ? t("close") : t("menu")}
            className="flex h-10 w-10 items-center justify-center rounded-btn text-night md:hidden dark:text-[#ECE7DD]"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
            >
              {open ? (
                <path
                  d="M6 6l12 12M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              ) : (
                <path
                  d="M4 7h16M4 12h16M4 17h16"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              )}
            </svg>
          </button>
        </div>
      </nav>

      {/* Panneau mobile */}
      {open && (
        <div className="border-t border-sand-300/70 bg-canvas px-5 py-4 md:hidden dark:border-anthracite-700/70 dark:bg-anthracite-900">
          <div className="flex flex-col gap-1">
            {navLinks.map((l) => (
              <a
                key={l.key}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-btn px-3 py-3 text-[18px] font-medium text-night dark:text-[#ECE7DD]"
              >
                {t(l.key)}
              </a>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2 border-t border-sand-300/70 pt-3 dark:border-anthracite-700/70">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="rounded-btn border border-navy px-4 py-3 text-center text-sm font-semibold text-navy dark:border-gold-light dark:text-gold-light"
            >
              {t("login")}
            </Link>
            <Link
              href="/bienvenue"
              onClick={() => setOpen(false)}
              className="rounded-btn bg-navy px-4 py-3 text-center text-sm font-semibold text-[#F4F1EA] dark:bg-gold-light dark:text-anthracite-900"
            >
              {t("start")}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
