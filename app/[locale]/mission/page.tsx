import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/Sections";
import { SacredMotif } from "@/components/SacredMotif";

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const t = await getTranslations({
    locale: params.locale,
    namespace: "pages.mission",
  });
  return {
    title: t("title"),
    description: t("lead"),
    openGraph: { type: "website", title: t("title"), description: t("lead") },
  };
}

const partners: { id: string; name: string }[] = [
  { id: "lumiere", name: "Lumière" },
  { id: "horizon", name: "Horizon" },
  { id: "lasource", name: "La Source" },
  { id: "veillee", name: "Veillée" },
];

export default async function MissionPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const params = await props.params;
  setRequestLocale(params.locale);
  const t = await getTranslations("pages.mission");

  return (
    <>
      <MarketingHeader />
      <main>
        {/* En-tête */}
        <section className="relative overflow-hidden border-b border-sand-300/60 dark:border-anthracite-700">
          <SacredMotif
            variant="dove"
            className="-right-16 top-6 hidden md:block"
          />
          <div className="mx-auto max-w-3xl px-5 py-20 text-center sm:px-6 sm:py-24">
            <p className="lbl text-[13px] text-gold-deep dark:text-gold-light">
              {t("kicker")}
            </p>
            <h1 className="mt-4 font-display text-4xl leading-tight text-night sm:text-5xl dark:text-[#ECE7DD]">
              {t("title")}
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-warmgray dark:text-[#A8A296]">
              {t("lead")}
            </p>
          </div>
        </section>

        {/* Corps */}
        <section className="mx-auto max-w-2xl px-5 py-16 sm:px-6">
          <div className="flex flex-col gap-6 text-[19px] leading-relaxed text-ink/90 dark:text-[#C7C2B8]">
            <p>{t("p1")}</p>
            <p>{t("p2")}</p>
            <p>{t("p3")}</p>
          </div>
        </section>

        {/* Partenaires placeholders */}
        <section className="border-y border-sand-300/60 bg-cream/60 dark:border-anthracite-700 dark:bg-anthracite-850/60">
          <div className="mx-auto max-w-5xl px-5 py-12 text-center sm:px-6">
            <p className="lbl text-[12px] text-sand-600 dark:text-[#8F8A80]">
              {t("partnersKicker")}
            </p>
            <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-12 gap-y-4">
              {partners.map((p) => (
                <li
                  key={p.id}
                  className="font-display text-xl italic text-sand-600/70 dark:text-[#8A857B]"
                >
                  {p.name}
                </li>
              ))}
            </ul>
            <p className="mt-5 text-[15px] text-sand-500 dark:text-[#6F6B62]">
              {t("partnersNote")}
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-3xl px-5 py-20 text-center sm:px-6">
          <h2 className="font-display text-3xl text-night dark:text-[#ECE7DD]">
            {t("ctaTitle")}
          </h2>
          <p className="mt-3 text-[18px] text-warmgray dark:text-[#A8A296]">
            {t("ctaBody")}
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/bienvenue"
              className="rounded-btnlg bg-navy px-7 py-4 text-[18px] font-semibold text-[#F4F1EA] transition-colors hover:bg-night dark:bg-gold-light dark:text-anthracite-900 dark:hover:bg-gold"
            >
              {t("ctaPrimary")}
            </Link>
            <Link
              href="/#journey"
              className="rounded-btnlg border border-navy/25 px-7 py-4 text-[18px] font-semibold text-navy transition-colors hover:border-navy dark:border-gold-light/30 dark:text-gold-light"
            >
              {t("ctaSecondary")}
            </Link>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </>
  );
}
