import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SacredMotif } from "@/components/SacredMotif";
import {
  pressLogos,
  whyUs,
  journeySteps,
  values,
  footerNav,
  appLinks,
} from "@/content/home";
import { Icon, type MarketingIcon } from "./icons";
import { InstallButton } from "./InstallButton";

/* --------------------------------------------------------------- */
/* En-tête de section réutilisable.                                 */
/* --------------------------------------------------------------- */
function SectionHeading({
  kicker,
  title,
  subtitle,
  align = "center",
}: {
  kicker: string;
  title: string;
  subtitle?: string;
  align?: "center" | "left";
}) {
  return (
    <div
      className={
        align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"
      }
    >
      <p className="lbl text-[10.5px] text-gold-deep dark:text-gold-light">
        {kicker}
      </p>
      <h2 className="mt-3 font-display text-3xl leading-tight text-night sm:text-4xl dark:text-[#ECE7DD]">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-4 text-[15px] leading-relaxed text-warmgray dark:text-[#A8A296]">
          {subtitle}
        </p>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- */
/* PressLogos — « On parle de nous » (wordmarks fictifs).           */
/* --------------------------------------------------------------- */
export async function PressLogos() {
  const t = await getTranslations("home.press");
  return (
    <section className="border-b border-sand-300/50 dark:border-anthracite-800">
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-6">
        <p className="lbl mb-6 text-center text-[10px] text-sand-600 dark:text-[#7E7A72]">
          {t("kicker")}
        </p>
        <ul className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 sm:gap-x-14">
          {pressLogos.map((p) => (
            <li
              key={p.id}
              className="font-display text-lg italic text-sand-600/80 grayscale transition hover:text-night hover:grayscale-0 sm:text-xl dark:text-[#8A857B] dark:hover:text-[#ECE7DD]"
            >
              {p.name}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- */
/* WhyUs — cartes de forces.                                        */
/* --------------------------------------------------------------- */
export async function WhyUs() {
  const t = await getTranslations("home.whyUs");
  return (
    <section id="why" className="scroll-mt-20">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6">
        <SectionHeading kicker={t("kicker")} title={t("title")} />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {whyUs.map((w) => (
            <div
              key={w.id}
              className="group rounded-cardlg border border-sand-300 bg-surface p-6 transition-shadow hover:shadow-cardfeat dark:border-anthracite-600 dark:bg-anthracite-800"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-card bg-navy/8 text-navy transition-colors group-hover:bg-navy group-hover:text-cream dark:bg-gold-light/10 dark:text-gold-light">
                <Icon name={w.icon} className="h-6 w-6" strokeWidth={1.6} />
              </span>
              <h3 className="mt-5 font-display text-xl text-night dark:text-[#ECE7DD]">
                {t(`items.${w.id}.title`)}
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed text-warmgray dark:text-[#9A958B]">
                {t(`items.${w.id}.body`)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- */
/* JourneySteps — timeline gamifiée des 6 étapes.                   */
/* --------------------------------------------------------------- */
const STEP_ICONS: Record<string, MarketingIcon> = {
  discovery: "compass",
  dialogue: "chat",
  discernment: "scale",
  accompaniment: "hands",
  engagement: "ring",
  preparation: "home",
};

export async function JourneySteps() {
  const t = await getTranslations("home.journey");
  return (
    <section
      id="journey"
      className="scroll-mt-20 border-y border-sand-300/60 bg-cream/60 dark:border-anthracite-700 dark:bg-anthracite-850/60"
    >
      <div className="relative mx-auto max-w-6xl overflow-hidden px-5 py-20 sm:px-6">
        <SacredMotif
          variant="tree"
          className="-left-16 bottom-0 hidden md:block"
        />
        <SectionHeading
          kicker={t("kicker")}
          title={t("title")}
          subtitle={t("subtitle")}
        />

        {/* Jauge de progression — façon Duolingo (décorative ici) */}
        <div className="mx-auto mt-10 max-w-md">
          <div className="mb-2 flex items-center justify-between text-[11px] font-semibold text-warmgray dark:text-[#9A958B]">
            <span className="lbl text-[10px]">{t("progressLabel")}</span>
            <span>1 / {journeySteps.length}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-sand-300 dark:bg-anthracite-700">
            <div
              className="h-full rounded-full bg-gradient-to-r from-gold to-gold-deep dark:from-gold-light dark:to-gold"
              style={{ width: `${100 / journeySteps.length}%` }}
            />
          </div>
        </div>

        <ol className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {journeySteps.map((s) => (
            <li
              key={s.id}
              className="relative rounded-cardlg border border-sand-300 bg-surface p-6 transition-transform hover:-translate-y-0.5 dark:border-anthracite-600 dark:bg-anthracite-800"
            >
              <div className="flex items-center gap-4">
                <span className="relative flex h-12 w-12 flex-none items-center justify-center rounded-full bg-navy text-cream dark:bg-gold-light dark:text-anthracite-900">
                  <Icon
                    name={STEP_ICONS[s.id]}
                    className="h-[22px] w-[22px]"
                    strokeWidth={1.7}
                  />
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-surface bg-gold text-[10px] font-bold text-night dark:border-anthracite-800">
                    {s.n}
                  </span>
                </span>
                <div>
                  <span className="lbl text-[9.5px] text-gold-deep dark:text-gold-light">
                    {t("stepLabel", { n: s.n })}
                  </span>
                  <h3 className="font-display text-lg text-night dark:text-[#ECE7DD]">
                    {t(`steps.${s.id}.title`)}
                  </h3>
                </div>
              </div>
              <p className="mt-4 text-[14px] leading-relaxed text-warmgray dark:text-[#9A958B]">
                {t(`steps.${s.id}.body`)}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- */
/* ValuesGrid — 4 valeurs.                                          */
/* --------------------------------------------------------------- */
export async function ValuesGrid() {
  const t = await getTranslations("home.values");
  return (
    <section className="mx-auto max-w-6xl px-5 py-20 sm:px-6">
      <SectionHeading kicker={t("kicker")} title={t("title")} />
      <div className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        {values.map((v) => (
          <div key={v.id} className="text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-gold/40 bg-gold/10 text-gold-deep dark:text-gold-light">
              <Icon name={v.icon} className="h-7 w-7" strokeWidth={1.5} />
            </span>
            <h3 className="mt-5 font-display text-xl text-night dark:text-[#ECE7DD]">
              {t(`${v.id}.title`)}
            </h3>
            <p className="mt-2 text-[14px] leading-relaxed text-warmgray dark:text-[#9A958B]">
              {t(`${v.id}.body`)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- */
/* AppDownloadSection — stores (placeholders) + PWA.                */
/* --------------------------------------------------------------- */
export async function AppDownloadSection() {
  const t = await getTranslations("home.download");
  return (
    <section id="download" className="scroll-mt-20 px-5 pb-20 sm:px-6">
      <div className="relative mx-auto max-w-5xl overflow-hidden rounded-screen bg-night px-6 py-16 text-cream sm:px-12 dark:bg-anthracite-850">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_85%_10%,rgba(201,168,76,.25),transparent_55%)]"
        />
        <SacredMotif
          variant="flame"
          className="-right-10 -bottom-10 opacity-100"
        />
        <div className="relative max-w-xl">
          <p className="lbl text-[10.5px] text-gold-light">{t("kicker")}</p>
          <h2 className="mt-3 font-display text-3xl leading-tight sm:text-4xl">
            {t("title")}
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-[#C7CBD6]">
            {t("body")}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={appLinks.appStore}
              className="inline-flex items-center gap-3 rounded-btnlg border border-white/15 bg-white/5 px-5 py-3.5 transition-colors hover:bg-white/10"
            >
              <Icon
                name="device"
                className="h-7 w-7 text-cream"
                strokeWidth={1.5}
              />
              <span className="text-left text-sm font-semibold leading-tight">
                {t("appStore")}
              </span>
            </a>
            <a
              href={appLinks.googlePlay}
              className="inline-flex items-center gap-3 rounded-btnlg border border-white/15 bg-white/5 px-5 py-3.5 transition-colors hover:bg-white/10"
            >
              <Icon
                name="play"
                className="h-6 w-6 text-cream"
                strokeWidth={1.5}
              />
              <span className="text-left text-sm font-semibold leading-tight">
                {t("googlePlay")}
              </span>
            </a>
            <InstallButton />
          </div>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- */
/* MarketingFooter — style colonnes (mission/ressources/légal).     */
/* --------------------------------------------------------------- */
function FooterLink({ href, label }: { href: string; label: string }) {
  const cls =
    "text-[14px] text-warmgray transition-colors hover:text-night dark:text-[#9A958B] dark:hover:text-[#ECE7DD]";
  // mailto / externe
  if (href.startsWith("mailto:") || href.startsWith("http")) {
    return (
      <a href={href} className={cls}>
        {label}
      </a>
    );
  }
  // ancre même-page (ex. /#journey) → pas de 404, pas de préfixe locale
  if (href.includes("#")) {
    return (
      <a href={href.replace(/^\//, "")} className={cls}>
        {label}
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {label}
    </Link>
  );
}

export async function MarketingFooter() {
  const t = await getTranslations("home.footer");
  const year = 2026; // millésime fixe (pas de Date.now en rendu statique)
  return (
    <footer className="border-t border-sand-300 bg-canvas dark:border-anthracite-700 dark:bg-anthracite-900">
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="max-w-xs">
            <div className="flex items-center gap-2.5 font-display text-[17px] font-semibold text-night dark:text-[#ECE7DD]">
              <span
                aria-hidden
                className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-navy text-[#F4F1EA] dark:bg-gold-light dark:text-anthracite-900"
              >
                <Icon name="ring" className="h-5 w-5" strokeWidth={1.7} />
              </span>
              Chemin d&apos;Alliance
            </div>
            <p className="mt-4 text-[14px] leading-relaxed text-warmgray dark:text-[#9A958B]">
              {t("tagline")}
            </p>
          </div>

          {footerNav.map((col) => (
            <div key={col.section}>
              <p className="lbl mb-4 text-[10px] text-sand-600 dark:text-[#7E7A72]">
                {t(`sections.${col.section}`)}
              </p>
              <ul className="flex flex-col gap-3">
                {col.links.map((l) => (
                  <li key={l.id}>
                    <FooterLink href={l.href} label={t(`links.${l.id}`)} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-sand-300/70 pt-6 text-[13px] text-sand-600 sm:flex-row sm:items-center sm:justify-between dark:border-anthracite-700 dark:text-[#7E7A72]">
          <p>
            © {year} Chemin d&apos;Alliance. {t("rights")}
          </p>
          <p className="max-w-md sm:text-right">{t("madeWith")}</p>
        </div>
      </div>
    </footer>
  );
}
