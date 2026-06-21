import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SacredMotif } from "@/components/SacredMotif";
import { Icon } from "./icons";

/**
 * Hero marketing. Visuel = placeholder élégant (dégradé + line-art + motifs
 * sacrés flottants), AUCUNE photo réelle. Server Component.
 */
export async function Hero() {
  const t = await getTranslations("home.hero");
  const trust = [t("trust1"), t("trust2"), t("trust3")];

  return (
    <section className="relative overflow-hidden">
      {/* Halo de fond */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(120%_80%_at_80%_-10%,rgba(201,168,76,.18),transparent_55%),radial-gradient(90%_70%_at_-10%_20%,rgba(26,39,68,.10),transparent_55%)] dark:bg-[radial-gradient(120%_80%_at_80%_-10%,rgba(216,184,96,.12),transparent_55%),radial-gradient(90%_70%_at_-10%_20%,rgba(216,184,96,.06),transparent_55%)]"
      />
      <SacredMotif
        variant="dove"
        className="-right-20 top-10 hidden lg:block"
      />

      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:py-28">
        {/* Colonne texte */}
        <div className="max-w-xl">
          <span className="lbl inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3.5 py-1.5 text-[10.5px] text-gold-ink dark:border-gold-light/30 dark:text-gold-light">
            <Icon name="sparkle" className="h-3.5 w-3.5" strokeWidth={1.8} />
            {t("badge")}
          </span>

          <h1 className="mt-6 font-display text-[2.6rem] leading-[1.06] text-night sm:text-6xl dark:text-[#ECE7DD]">
            {t("title")}{" "}
            <span className="bg-gradient-to-r from-gold-deep to-gold bg-clip-text italic text-transparent dark:from-gold-light dark:to-gold">
              {t("titleAccent")}
            </span>
          </h1>

          <p className="mt-6 text-lg leading-relaxed text-warmgray dark:text-[#A8A296]">
            {t("subtitle")}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/bienvenue"
              className="group inline-flex items-center justify-center gap-2 rounded-btnlg bg-navy px-7 py-4 text-[15px] font-semibold text-[#F4F1EA] shadow-cardfeat transition-colors hover:bg-night dark:bg-gold-light dark:text-anthracite-900 dark:hover:bg-gold"
            >
              {t("ctaPrimary")}
              <Icon
                name="arrowRight"
                className="h-[18px] w-[18px] transition-transform group-hover:translate-x-0.5"
                strokeWidth={1.8}
              />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-btnlg border border-navy/25 bg-surface/70 px-7 py-4 text-[15px] font-semibold text-navy transition-colors hover:border-navy hover:bg-surface dark:border-gold-light/30 dark:bg-anthracite-800/60 dark:text-gold-light dark:hover:border-gold-light"
            >
              {t("ctaSecondary")}
            </Link>
          </div>

          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2.5">
            {trust.map((label) => (
              <li
                key={label}
                className="flex items-center gap-2 text-[13.5px] font-medium text-warmgray dark:text-[#9A958B]"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sage/15 text-sage dark:bg-sage/25">
                  <Icon
                    name="check"
                    className="h-3.5 w-3.5"
                    strokeWidth={2.2}
                  />
                </span>
                {label}
              </li>
            ))}
          </ul>
        </div>

        {/* Colonne visuelle - placeholder soigné, pas de photo */}
        <div className="relative mx-auto w-full max-w-md">
          <div className="relative aspect-[4/5] overflow-hidden rounded-[28px] border border-white/40 bg-gradient-to-br from-navy via-night to-[#0E1626] shadow-phone dark:border-white/10">
            {/* texture dorée */}
            <div
              aria-hidden
              className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(201,168,76,.35),transparent_60%)]"
            />
            <SacredMotif
              variant="olive"
              className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-100"
            />

            {/* carte flottante haut */}
            <div className="absolute left-5 top-6 flex items-center gap-2.5 rounded-card border border-white/15 bg-white/10 px-3.5 py-2.5 backdrop-blur-md">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sage/30 text-[#CFE7D6]">
                <Icon name="shield" className="h-4 w-4" strokeWidth={1.8} />
              </span>
              <span className="text-[12.5px] font-semibold text-[#F4F1EA]">
                {t("trust1")}
              </span>
            </div>

            {/* anneau central */}
            <div className="absolute left-1/2 top-1/2 flex h-32 w-32 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-gold/40 bg-white/5 backdrop-blur-sm">
              <Icon
                name="ring"
                className="h-14 w-14 text-gold-light"
                strokeWidth={1.3}
              />
            </div>

            {/* carte flottante bas */}
            <div className="absolute bottom-6 right-5 flex items-center gap-2.5 rounded-card border border-white/15 bg-white/10 px-3.5 py-2.5 backdrop-blur-md">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gold/25 text-gold-light">
                <Icon name="lock" className="h-4 w-4" strokeWidth={1.8} />
              </span>
              <span className="text-[12.5px] font-semibold text-[#F4F1EA]">
                {t("trust2")}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
