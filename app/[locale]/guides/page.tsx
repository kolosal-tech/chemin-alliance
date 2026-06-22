import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/Sections";
import { Icon } from "@/components/marketing/icons";
import { guideTopics } from "@/content/guides";

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({
    locale: params.locale,
    namespace: "pages.guides",
  });
  return {
    title: t("title"),
    description: t("subtitle"),
    openGraph: {
      type: "website",
      title: t("title"),
      description: t("subtitle"),
    },
  };
}

export default async function GuidesPage({
  params,
}: {
  params: { locale: string };
}) {
  setRequestLocale(params.locale);
  const t = await getTranslations("pages.guides");

  return (
    <>
      <MarketingHeader />
      <main>
        <section className="mx-auto max-w-3xl px-5 py-16 text-center sm:px-6 sm:py-20">
          <p className="lbl text-[13px] text-gold-deep dark:text-gold-light">
            {t("kicker")}
          </p>
          <h1 className="mt-4 font-display text-4xl leading-tight text-night sm:text-5xl dark:text-[#ECE7DD]">
            {t("title")}
          </h1>
          <p className="mt-5 text-[19px] leading-relaxed text-warmgray dark:text-[#A8A296]">
            {t("subtitle")}
          </p>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-24 sm:px-6">
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {guideTopics.map((g) => {
              const card = (
                <>
                  <span className="flex h-12 w-12 items-center justify-center rounded-card bg-navy/8 text-navy dark:bg-gold-light/10 dark:text-gold-light">
                    <Icon name={g.icon} className="h-6 w-6" strokeWidth={1.6} />
                  </span>
                  <h2 className="mt-5 font-display text-xl text-night dark:text-[#ECE7DD]">
                    {t(`topics.${g.id}.title`)}
                  </h2>
                  <p className="mt-2 flex-1 text-[17px] leading-relaxed text-warmgray dark:text-[#9A958B]">
                    {t(`topics.${g.id}.desc`)}
                  </p>
                  {g.ready ? (
                    <span className="mt-5 inline-flex w-fit items-center gap-1.5 text-[17px] font-semibold text-navy group-hover:gap-2.5 dark:text-gold-light">
                      {t("readGuide")}
                      <Icon
                        name="arrowRight"
                        className="h-4 w-4 transition-all"
                        strokeWidth={1.9}
                      />
                    </span>
                  ) : (
                    <span className="mt-5 inline-flex w-fit items-center gap-1.5 rounded-full bg-gold/12 px-3 py-1.5 text-[13px] font-semibold text-gold-ink dark:bg-gold-light/10 dark:text-gold-light">
                      {t("soon")}
                    </span>
                  )}
                </>
              );
              return (
                <li key={g.id}>
                  {g.ready ? (
                    <Link
                      href={`/guides/${g.id}`}
                      className="group flex h-full flex-col rounded-cardlg border border-sand-300 bg-surface p-7 transition-shadow hover:shadow-cardfeat dark:border-anthracite-600 dark:bg-anthracite-800"
                    >
                      {card}
                    </Link>
                  ) : (
                    <div className="flex h-full flex-col rounded-cardlg border border-sand-300 bg-surface p-7 dark:border-anthracite-600 dark:bg-anthracite-800">
                      {card}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </main>
      <MarketingFooter />
    </>
  );
}
