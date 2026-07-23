import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AllianceThread } from "@/components/AllianceThread";
import { LockBadge } from "@/components/LockBadge";
import { Radar } from "@/components/Radar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Phase2Showcase } from "@/components/Phase2Showcase";
import { ProfileShowcase } from "@/components/product/ProfileShowcase";
import { ReviewsSection } from "@/components/product/ReviewsSection";
import { SafetyBlock } from "@/components/product/SafetyBlock";
import { FiltersDrawer } from "@/components/product/FiltersDrawer";

export default async function DesignSystemPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const params = await props.params;
  setRequestLocale(params.locale);
  const t = await getTranslations("designSystem");
  const tv = await getTranslations("visibility");

  const card =
    "rounded-cardlg border border-sand-300 bg-surface p-7 dark:border-anthracite-600 dark:bg-anthracite-800";
  const label = "lbl mb-5 block text-[12px] text-sand-600 dark:text-[#9A958B]";

  return (
    <main className="mx-auto max-w-5xl px-6 py-12 safe-top safe-bottom">
      <div className="mb-10 flex items-start justify-between">
        <div>
          <h1 className="font-display text-4xl text-night dark:text-[#ECE7DD]">
            {t("title")}
          </h1>
          <p className="mt-2 text-[18px] text-sand-600 dark:text-[#9A958B]">
            {t("subtitle")}
          </p>
        </div>
        <ThemeToggle />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Boutons */}
        <section className={card}>
          <span className={label}>{t("buttons")}</span>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <button className="rounded-btn bg-navy px-5 py-3 text-sm font-semibold text-[#F4F1EA] hover:bg-night dark:bg-gold-light dark:text-anthracite-900">
              {t("primary")}
            </button>
            <button className="rounded-btn border border-navy px-5 py-3 text-sm font-semibold text-navy dark:border-gold-light dark:text-gold-light">
              {t("secondary")}
            </button>
            <button className="rounded-btn px-3.5 py-3 text-sm font-semibold text-gold-deep dark:text-gold-light">
              {t("tertiary")}
            </button>
            <button className="rounded-btn border border-danger-border px-5 py-3 text-sm font-semibold text-danger dark:border-danger-darkBorder dark:text-danger-darkInk">
              {t("destructive")}
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button className="rounded-btn bg-navy px-5 py-3 text-sm font-semibold text-[#F4F1EA] ring-2 ring-gold ring-offset-2 ring-offset-cream dark:ring-offset-anthracite-900">
              Focus
            </button>
            <button
              disabled
              className="cursor-not-allowed rounded-btn bg-sand-400/60 px-5 py-3 text-sm font-semibold text-sand-500 dark:bg-anthracite-600 dark:text-[#9A958B]"
            >
              Disabled
            </button>
          </div>
        </section>

        {/* Inputs */}
        <section className={card}>
          <span className={label}>{t("inputs")}</span>
          <div className="flex flex-col gap-3.5">
            <input
              defaultValue="Texte saisi"
              className="rounded-btnsm border border-sand-400 bg-surface px-3.5 py-3 text-sm dark:border-anthracite-600 dark:bg-anthracite-700 dark:text-[#ECE7DD]"
            />
            <select className="rounded-btnsm border border-sand-400 bg-surface px-3.5 py-3 text-sm text-warmgray dark:border-anthracite-600 dark:bg-anthracite-700 dark:text-[#9A958B]">
              <option>Dénomination</option>
            </select>
            <div className="flex items-center gap-3.5">
              <span className="relative h-[27px] w-[46px] rounded-[14px] bg-navy dark:bg-gold-light">
                <span className="absolute right-[3px] top-[3px] h-[21px] w-[21px] rounded-full bg-white" />
              </span>
              <span className="text-[16px] text-warmgray dark:text-[#9A958B]">
                Toggle
              </span>
              <span className="relative ml-auto h-[27px] w-[46px] rounded-[14px] bg-sand-400 dark:bg-anthracite-600">
                <span className="absolute left-[3px] top-[3px] h-[21px] w-[21px] rounded-full bg-white" />
              </span>
            </div>
            <input
              type="range"
              defaultValue={50}
              className="accent-[#1A2744] dark:accent-[#D8B860]"
            />
          </div>
        </section>

        {/* Badges */}
        <section className={card}>
          <span className={label}>{t("badges")}</span>
          <div className="flex flex-wrap gap-2.5">
            <span className="flex items-center gap-1.5 rounded-[9px] bg-sage-surface px-3 py-2 text-xs font-semibold text-sage-ink dark:bg-sage-darkSurface dark:text-sage-darkInk">
              ✓ Vérifié
            </span>
            <span className="rounded-[9px] bg-navy px-3 py-2 text-xs font-semibold text-[#E8D9A8]">
              Évangélique
            </span>
            <span className="rounded-[9px] bg-info-surface px-3 py-2 text-xs font-semibold text-info-ink dark:bg-info-darkSurface dark:text-info-darkInk">
              Catholique
            </span>
            <span className="rounded-[9px] bg-gold-surface px-3 py-2 text-xs font-semibold text-gold-ink dark:bg-gold-darkSurface dark:text-gold-darkInk">
              Étape · Discernement
            </span>
            <span className="rounded-[9px] border border-gold/50 bg-gold/15 px-3 py-2 text-xs font-semibold text-gold-ink dark:text-[#E0C77A]">
              ★ Coach certifié
            </span>
          </div>
        </section>

        {/* Cadenas */}
        <section className={card}>
          <span className={label}>{t("locks")}</span>
          <p className="mb-4 text-xs text-sand-500 dark:text-[#9A958B]">
            {tv("explain")}
          </p>
          <div className="flex flex-wrap gap-2.5">
            <LockBadge level="PUBLIC_CONTROLLED" />
            <LockBadge level="AFTER_MATCH" />
            <LockBadge level="AFTER_DIALOGUE" />
            <LockBadge level="AFTER_DISCERNMENT" />
            <LockBadge level="PRIVATE" />
          </div>
        </section>

        {/* Timeline */}
        <section className={`${card} md:col-span-2`}>
          <span className={label}>{t("timeline")}</span>
          <AllianceThread current={3} />
        </section>

        {/* Toasts */}
        <section className={card}>
          <span className={label}>{t("toasts")}</span>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 rounded-btn border border-sage-border bg-sage-surface px-4 py-3 text-[16px] text-sage-ink dark:border-sage-darkBorder dark:bg-sage-darkSurface dark:text-sage-darkInk">
              {t("toastSuccess")}
            </div>
            <div className="flex items-center gap-3 rounded-btn border border-info-border bg-info-surface px-4 py-3 text-[16px] text-info-ink dark:border-info-darkBorder dark:bg-info-darkSurface dark:text-info-darkInk">
              {t("toastInfo")}
            </div>
            <div className="flex items-center gap-3 rounded-btn border border-warn-border bg-warn-surface px-4 py-3 text-[16px] text-warn-ink dark:border-warn-darkBorder dark:bg-warn-darkSurface dark:text-warn-darkInk">
              {t("toastWarn")}
            </div>
          </div>
        </section>

        {/* Message système */}
        <section className={card}>
          <span className={label}>{t("systemMsg")}</span>
          <div className="flex gap-3 rounded-[14px] border border-warn-border bg-warn-surface px-4 py-4 dark:border-warn-darkBorder dark:bg-warn-darkSurface">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              className="mt-0.5 flex-none"
              aria-hidden
            >
              <rect
                x="5"
                y="11"
                width="14"
                height="9"
                rx="2"
                className="stroke-warn dark:stroke-warn-darkInk"
                strokeWidth="1.7"
              />
              <path
                d="M8 11V8a4 4 0 0 1 8 0v3"
                className="stroke-warn dark:stroke-warn-darkInk"
                strokeWidth="1.7"
              />
              <circle
                cx="12"
                cy="15.5"
                r="1.3"
                className="fill-warn dark:fill-warn-darkInk"
              />
            </svg>
            <div>
              <div className="mb-1 text-sm font-semibold text-warn-ink dark:text-warn-darkInk">
                Coordonnées en attente
              </div>
              <p className="text-[16px] leading-normal text-warn-ink dark:text-warn-darkInk">
                Pour votre sécurité, le partage de coordonnées sera disponible à
                la validation mutuelle de confiance, à l&apos;étape
                Discernement.
              </p>
            </div>
          </div>
        </section>

        {/* Radar */}
        <section className={`${card} md:col-span-2`}>
          <span className={label}>{t("radar")}</span>
          <div className="flex justify-center">
            <Radar
              axes={{
                faith: 0.92,
                children: 0.85,
                finances: 0.5,
                location: 0.45,
                vision: 0.8,
              }}
            />
          </div>
        </section>

        {/* Phase 2 - gamification (jauge + modale) */}
        <section className={`${card} md:col-span-2`}>
          <span className={label}>{t("gamification")}</span>
          <Phase2Showcase />
        </section>

        {/* Deliverable 4 - profil gamifié, sécurité, filtres */}
        <section className={`${card} md:col-span-2`}>
          <span className={label}>{t("deliverable4")}</span>
          <div className="flex flex-wrap items-start gap-6">
            <ProfileShowcase />
            <div className="flex-1 space-y-5" style={{ minWidth: "260px" }}>
              <SafetyBlock />
              <Suspense fallback={null}>
                <FiltersDrawer activeCount={2} />
              </Suspense>
            </div>
          </div>
        </section>

        {/* Deliverable 4 - avis notés */}
        <section className={`${card} md:col-span-2`}>
          <span className={label}>{t("reviews")}</span>
          <ReviewsSection />
        </section>

        {/* Liquid Glass - bulles, boutons, switch (référence + test public) */}
        <section
          className={`${card} md:col-span-2`}
          data-testid="glass-showcase"
        >
          <span className={label}>Liquid Glass</span>
          <div
            data-testid="msg-scroll"
            className="msg-scroll flex max-h-56 flex-col gap-2.5 overflow-y-auto pl-0.5 pr-2"
          >
            <div className="flex max-w-[82%] flex-col items-start self-start">
              <div
                data-testid="bubble-peer"
                className="bubble bubble-peer rounded-[18px] rounded-bl-md px-3.5 py-2.5 text-sm leading-snug"
              >
                Bonjour mon amour, comment vas-tu ce matin&nbsp;?
              </div>
            </div>
            <div className="flex max-w-[82%] flex-col items-end self-end">
              <div
                data-testid="bubble-self"
                className="bubble bubble-self rounded-[18px] rounded-br-md px-3.5 py-2.5 text-sm leading-snug"
              >
                Très bien, j&apos;ai prié pour nous deux.
              </div>
            </div>
            <div className="flex max-w-[82%] flex-col items-end self-end">
              <div className="bubble bubble-self rounded-[18px] rounded-br-md px-3.5 py-2.5 text-sm leading-snug">
                On se voit ce soir&nbsp;?
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button className="btn-glass btn-glass-blue rounded-btn px-5 py-3 text-sm">
              CTA principal
            </button>
            <button className="btn-glass btn-glass-sage rounded-btn px-5 py-3 text-sm">
              Envoyer
            </button>
            <button className="btn-glass btn-glass-gold rounded-btn px-5 py-3 text-sm">
              Doré doux
            </button>
            <button className="btn-glass btn-glass-neutral rounded-btn px-5 py-3 text-sm">
              Neutre
            </button>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked="true"
              aria-label="Exemple actif"
              disabled
              className="relative inline-flex h-[24px] w-[42px] flex-none items-center rounded-full border border-[#4FA06C]/50 bg-[#4FA06C]/85 backdrop-blur-md dark:border-[#4C9566]/50 dark:bg-[#4C9566]/80"
            >
              <span className="ml-[21px] inline-block h-[18px] w-[18px] rounded-full bg-white shadow-sm" />
            </button>
            <button
              type="button"
              role="switch"
              aria-checked="false"
              aria-label="Exemple inactif"
              disabled
              className="relative inline-flex h-[24px] w-[42px] flex-none items-center rounded-full border border-[#7E7363]/30 bg-[#968C78]/30 backdrop-blur-md dark:border-white/15 dark:bg-white/10"
            >
              <span className="ml-[3px] inline-block h-[18px] w-[18px] rounded-full bg-white shadow-sm" />
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
