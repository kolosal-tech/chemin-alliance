import { getTranslations, setRequestLocale } from "next-intl/server";
import { AllianceThread } from "@/components/AllianceThread";
import { LockBadge } from "@/components/LockBadge";
import { Radar } from "@/components/Radar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Phase2Showcase } from "@/components/Phase2Showcase";

export default async function DesignSystemPage({
  params,
}: {
  params: { locale: string };
}) {
  setRequestLocale(params.locale);
  const t = await getTranslations("designSystem");
  const tv = await getTranslations("visibility");

  const card =
    "rounded-cardlg border border-sand-300 bg-surface p-7 dark:border-anthracite-600 dark:bg-anthracite-800";
  const label = "lbl mb-5 block text-[10px] text-sand-600 dark:text-[#9A958B]";

  return (
    <main className="mx-auto max-w-5xl px-6 py-12 safe-top safe-bottom">
      <div className="mb-10 flex items-start justify-between">
        <div>
          <h1 className="font-display text-4xl text-night dark:text-[#ECE7DD]">
            {t("title")}
          </h1>
          <p className="mt-2 text-[15px] text-sand-600 dark:text-[#9A958B]">
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
            <button className="rounded-btn border border-[#D8B6B0] px-5 py-3 text-sm font-semibold text-danger dark:border-[#5A3A34]">
              {t("destructive")}
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button className="rounded-btn bg-navy px-5 py-3 text-sm font-semibold text-[#F4F1EA] ring-2 ring-gold ring-offset-2 ring-offset-cream dark:ring-offset-anthracite-900">
              Focus
            </button>
            <button
              disabled
              className="cursor-not-allowed rounded-btn bg-sand-400/60 px-5 py-3 text-sm font-semibold text-sand-500 dark:bg-anthracite-600 dark:text-[#65625B]"
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
              className="rounded-btnsm border border-sand-400 bg-white px-3.5 py-3 text-sm dark:border-anthracite-600 dark:bg-anthracite-700 dark:text-[#ECE7DD]"
            />
            <select className="rounded-btnsm border border-sand-400 bg-white px-3.5 py-3 text-sm text-warmgray dark:border-anthracite-600 dark:bg-anthracite-700 dark:text-[#9A958B]">
              <option>Dénomination</option>
            </select>
            <div className="flex items-center gap-3.5">
              <span className="relative h-[27px] w-[46px] rounded-[14px] bg-navy dark:bg-gold-light">
                <span className="absolute right-[3px] top-[3px] h-[21px] w-[21px] rounded-full bg-white" />
              </span>
              <span className="text-[13px] text-warmgray dark:text-[#9A958B]">
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
            <span className="flex items-center gap-1.5 rounded-[9px] bg-[#EAF0EB] px-3 py-2 text-xs font-semibold text-sage dark:bg-[#1B2A20] dark:text-[#7FA98C]">
              ✓ Vérifié
            </span>
            <span className="rounded-[9px] bg-navy px-3 py-2 text-xs font-semibold text-[#E8D9A8]">
              Évangélique
            </span>
            <span className="rounded-[9px] bg-[#E7EBF1] px-3 py-2 text-xs font-semibold text-[#2A3550] dark:bg-[#222C42] dark:text-[#B9C6E0]">
              Catholique
            </span>
            <span className="rounded-[9px] bg-[#F1EBD9] px-3 py-2 text-xs font-semibold text-gold-ink dark:bg-[#2C2818] dark:text-gold-light">
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
          <p className="mb-4 text-xs text-sand-500 dark:text-[#65625B]">
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
            <div className="flex items-center gap-3 rounded-btn border border-[#CFE0D4] bg-[#EAF0EB] px-4 py-3 text-[13.5px] text-[#2E5440] dark:border-[#2E4A38] dark:bg-[#1B2A20] dark:text-[#9FC7AC]">
              {t("toastSuccess")}
            </div>
            <div className="flex items-center gap-3 rounded-btn border border-[#D4DAE4] bg-[#EAEDF2] px-4 py-3 text-[13.5px] text-[#2A3550] dark:border-[#2A3A56] dark:bg-[#1A2233] dark:text-[#B9C6E0]">
              {t("toastInfo")}
            </div>
            <div className="flex items-center gap-3 rounded-btn border border-[#EAD9A8] bg-[#FBF6E9] px-4 py-3 text-[13.5px] text-gold-ink dark:border-[#463A1F] dark:bg-[#272117] dark:text-[#E0C77A]">
              {t("toastWarn")}
            </div>
          </div>
        </section>

        {/* Message système */}
        <section className={card}>
          <span className={label}>{t("systemMsg")}</span>
          <div className="flex gap-3 rounded-[14px] border border-[#EAD9A8] bg-[#FBF6E9] px-4 py-4 dark:border-[#463A1F] dark:bg-[#272117]">
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
                stroke="#9A7B2E"
                strokeWidth="1.7"
              />
              <path
                d="M8 11V8a4 4 0 0 1 8 0v3"
                stroke="#9A7B2E"
                strokeWidth="1.7"
              />
              <circle cx="12" cy="15.5" r="1.3" fill="#9A7B2E" />
            </svg>
            <div>
              <div className="mb-1 text-sm font-semibold text-gold-ink dark:text-[#E0C77A]">
                Coordonnées en attente
              </div>
              <p className="text-[13px] leading-normal text-[#6F5C2E] dark:text-[#C2B488]">
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

        {/* Phase 2 — gamification (jauge + modale) */}
        <section className={`${card} md:col-span-2`}>
          <span className={label}>{t("gamification")}</span>
          <Phase2Showcase />
        </section>
      </div>
    </main>
  );
}
