"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { testimonials } from "@/content/home";
import { Icon } from "./icons";

/** Initiales pour l'avatar placeholder (pas de photo réelle). */
function initials(name: string) {
  return name
    .split(/[\s&\-–]+/) // espace, &, trait d'union, tiret demi-cadratin
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export function TestimonialsCarousel() {
  const t = useTranslations("home.testimonials");
  const [i, setI] = useState(0);
  const n = testimonials.length;
  const go = (d: number) => setI((p) => (p + d + n) % n);
  const active = testimonials[i];

  return (
    <div className="mx-auto mt-10 max-w-3xl">
      <div
        className="relative rounded-cardlg border border-sand-300 bg-surface p-7 shadow-cardfeat sm:p-10 dark:border-anthracite-600 dark:bg-anthracite-800"
        role="group"
        aria-roledescription="carousel"
      >
        <Icon
          name="sparkle"
          className="absolute right-7 top-7 h-7 w-7 text-gold/40"
          strokeWidth={1.4}
        />
        <blockquote
          aria-live="polite"
          className="font-display text-xl leading-relaxed text-night sm:text-2xl dark:text-[#ECE7DD]"
        >
          “{t(`items.${active.id}.quote`)}”
        </blockquote>

        <figcaption className="mt-7 flex items-center gap-4">
          <span
            aria-hidden
            className={`flex h-12 w-12 flex-none items-center justify-center rounded-full bg-gradient-to-br ${active.gradient} font-display text-base font-semibold text-cream`}
          >
            {initials(active.name)}
          </span>
          <div>
            <div className="text-[18px] font-semibold text-night dark:text-[#ECE7DD]">
              {active.name}
            </div>
            <div className="text-[16px] text-warmgray dark:text-[#9A958B]">
              {t(`items.${active.id}.role`)} ·{" "}
              {t("duration", { months: active.months })}
            </div>
          </div>
        </figcaption>
      </div>

      {/* Contrôles */}
      <div className="mt-6 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => go(-1)}
          aria-label={t("prev")}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-sand-400 text-navy transition-colors hover:bg-navy hover:text-cream dark:border-anthracite-600 dark:text-gold-light dark:hover:bg-gold-light dark:hover:text-anthracite-900"
        >
          <Icon
            name="arrowRight"
            className="h-5 w-5 rotate-180"
            strokeWidth={1.8}
          />
        </button>

        <div className="flex items-center gap-2" role="tablist">
          {testimonials.map((tst, idx) => (
            <button
              key={tst.id}
              type="button"
              role="tab"
              aria-selected={idx === i}
              aria-label={`${idx + 1} / ${n}`}
              onClick={() => setI(idx)}
              className={`h-2 rounded-full transition-all ${
                idx === i
                  ? "w-6 bg-gold"
                  : "w-2 bg-sand-400 hover:bg-sand-500 dark:bg-anthracite-600"
              }`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => go(1)}
          aria-label={t("next")}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-sand-400 text-navy transition-colors hover:bg-navy hover:text-cream dark:border-anthracite-600 dark:text-gold-light dark:hover:bg-gold-light dark:hover:text-anthracite-900"
        >
          <Icon name="arrowRight" className="h-5 w-5" strokeWidth={1.8} />
        </button>
      </div>
    </div>
  );
}
