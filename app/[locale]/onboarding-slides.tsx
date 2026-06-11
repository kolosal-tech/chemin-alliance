"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AllianceThread } from "@/components/AllianceThread";
import { SacredMotif } from "@/components/SacredMotif";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";

export function OnboardingSlides() {
  const t = useTranslations("onboarding");
  const tc = useTranslations("common");
  const [slide, setSlide] = useState(0);

  const dots = (
    <div className="mt-4 flex justify-center gap-1.5" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`h-1 rounded-full transition-all ${
            i === slide ? "w-[22px] bg-gold" : "w-1.5 bg-sand-400 dark:bg-anthracite-600"
          }`}
        />
      ))}
    </div>
  );

  return (
    <main className="relative mx-auto flex min-h-dvh max-w-md flex-col overflow-hidden px-7 pb-8 safe-top safe-bottom">
      <div className="flex items-center justify-between pt-4">
        <div className="flex items-center gap-2.5">
          <span className="inline-block h-px w-[22px] bg-gold" aria-hidden />
          <span className="lbl text-[10px] text-gold-deep dark:text-gold-light">
            {t("s1Label")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>

      {slide === 0 && (
        <section className="relative flex flex-1 flex-col rounded-screen bg-night px-7 py-9 text-[#F4F1EA] shadow-phone mt-5">
          <SacredMotif variant="dove" className="right-[-80px] top-[-40px]" />
          <div className="flex flex-1 flex-col justify-center">
            <h1 className="font-display text-[40px] font-normal leading-[1.12] tracking-tight">
              {t("s1Title")}
            </h1>
            <p className="mt-5 max-w-[30ch] text-base leading-relaxed text-[#A6AEC0]">
              {t("s1Body")}
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => setSlide(1)}
              className="rounded-btnlg bg-gold px-4 py-4 text-base font-semibold text-night"
            >
              {t("s1Cta")}
            </button>
            <Link
              href="/login"
              className="rounded-btnlg border border-[#2E3A57] px-4 py-3.5 text-center text-[15px] font-medium text-[#D7DCE6]"
            >
              {t("s1Login")}
            </Link>
            {dots}
          </div>
        </section>
      )}

      {slide === 1 && (
        <section className="relative mt-5 flex flex-1 flex-col rounded-screen bg-cream px-8 py-8 shadow-phone dark:bg-anthracite-850">
          <SacredMotif variant="olive" className="bottom-[-60px] right-[-100px]" />
          <span className="lbl text-[10px] text-gold-deep dark:text-gold-light">{t("s2Label")}</span>
          <h2 className="mb-6 mt-2 font-display text-[30px] leading-[1.15] text-night dark:text-[#ECE7DD]">
            {t("s2Title")}
          </h2>
          <AllianceThread current={3} orientation="vertical" />
          <div className="mt-auto flex flex-col gap-3 pt-4">
            <button
              type="button"
              onClick={() => setSlide(2)}
              className="rounded-btnlg bg-navy px-4 py-4 text-base font-semibold text-[#F4F1EA] dark:bg-gold-light dark:text-anthracite-900"
            >
              {t("next")}
            </button>
            {dots}
          </div>
        </section>
      )}

      {slide === 2 && (
        <section className="relative mt-5 flex flex-1 flex-col rounded-screen bg-cream px-7 py-8 shadow-phone dark:bg-anthracite-850">
          <SacredMotif variant="flame" className="right-[-90px] top-[-30px]" />
          <span className="lbl text-[10px] text-gold-deep dark:text-gold-light">{t("s3Label")}</span>
          <h2 className="mb-6 mt-2 font-display text-[30px] leading-[1.15] text-night dark:text-[#ECE7DD]">
            {t("s3Title")}
          </h2>
          <div className="flex flex-1 flex-col gap-3.5">
            {(["g1", "g2", "g3"] as const).map((g, i) => (
              <div
                key={g}
                className="rounded-card border border-sand-200 bg-surface p-5 dark:border-anthracite-600 dark:bg-anthracite-800"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="mb-3 text-navy dark:text-[#B9C6E0]" aria-hidden>
                  {i === 0 && (
                    <>
                      <rect x="5" y="10.5" width="14" height="9.5" rx="2.2" stroke="currentColor" strokeWidth="1.6" />
                      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" stroke="currentColor" strokeWidth="1.6" />
                      <circle cx="12" cy="15" r="1.4" fill="#C9A84C" />
                    </>
                  )}
                  {i === 1 && (
                    <>
                      <path d="M12 4c2.5 2 5 2.5 6.5 2.5v6c0 4-3.5 6-6.5 7.5-3-1.5-6.5-3.5-6.5-7.5v-6C7 6.5 9.5 6 12 4Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                      <path d="M9.3 12.2l1.9 1.9 3.5-3.7" stroke="#C9A84C" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                    </>
                  )}
                  {i === 2 && (
                    <path d="M5 8h14M5 8l3.5 4L5 16M19 8l-3.5 4 3.5 4M8.5 12h7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  )}
                </svg>
                <div className="font-display text-[19px] text-night dark:text-[#ECE7DD]">
                  {t(`${g}Title`)}
                </div>
                <p className="mt-1.5 text-[13.5px] leading-normal text-[#6B665C] dark:text-[#9A958B]">
                  {t(`${g}Body`)}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-col gap-3">
            <Link
              href="/register"
              className="rounded-btnlg bg-navy px-4 py-4 text-center text-base font-semibold text-[#F4F1EA] dark:bg-gold-light dark:text-anthracite-900"
            >
              {t("s3Cta")}
            </Link>
            {dots}
          </div>
        </section>
      )}

      <p className="sr-only">{tc("tagline")}</p>
    </main>
  );
}
