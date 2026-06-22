import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getTranslations,
  setRequestLocale,
  getFormatter,
} from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/Sections";
import { Icon } from "@/components/marketing/icons";
import {
  guideTopics,
  guideContent,
  getGuideTopic,
  localizedGuide,
} from "@/content/guides";

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    guideTopics.map((g) => ({ locale, topic: g.id })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: { locale: string; topic: string };
}): Promise<Metadata> {
  const topic = getGuideTopic(params.topic);
  if (!topic) return {};
  const t = await getTranslations({
    locale: params.locale,
    namespace: "pages.guides",
  });
  const title = t(`topics.${topic.id}.title`);
  const description = t(`topics.${topic.id}.desc`);
  return {
    title,
    description,
    openGraph: {
      type: "article",
      title,
      description,
      publishedTime: topic.date,
      locale: params.locale,
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function GuideDetailPage({
  params,
}: {
  params: { locale: string; topic: string };
}) {
  setRequestLocale(params.locale);
  const topic = getGuideTopic(params.topic);
  const article = guideContent[params.topic];
  if (!topic || !topic.ready || !article) notFound();

  const t = await getTranslations("pages.guides");
  const format = await getFormatter();
  const body = localizedGuide(article, params.locale);
  const title = t(`topics.${topic.id}.title`);
  const description = t(`topics.${topic.id}.desc`);

  // schema.org Article (SEO)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    datePublished: topic.date,
    inLanguage: params.locale,
    author: { "@type": "Organization", name: "Chemin d'Alliance" },
    publisher: { "@type": "Organization", name: "Chemin d'Alliance" },
  };

  return (
    <>
      <MarketingHeader />
      <main>
        <article className="mx-auto max-w-2xl px-5 py-12 sm:px-6 sm:py-16">
          <Link
            href="/guides"
            className="inline-flex items-center gap-1.5 text-[16px] font-medium text-warmgray transition-colors hover:text-night dark:text-[#9A958B] dark:hover:text-[#ECE7DD]"
          >
            <Icon
              name="arrowRight"
              className="h-4 w-4 rotate-180"
              strokeWidth={1.8}
            />
            {t("back")}
          </Link>

          <div className="mt-8 flex items-center gap-3">
            <span className="flex h-12 w-12 flex-none items-center justify-center rounded-card bg-navy/8 text-navy dark:bg-gold-light/10 dark:text-gold-light">
              <Icon name={topic.icon} className="h-6 w-6" strokeWidth={1.6} />
            </span>
            <div className="lbl text-[12px] text-gold-deep dark:text-gold-light">
              {t("badge")} ·{" "}
              {format.dateTime(new Date(topic.date), { dateStyle: "long" })} ·{" "}
              {t("minRead", { min: topic.readingMinutes })}
            </div>
          </div>

          <h1 className="mt-5 font-display text-4xl leading-tight text-night sm:text-[2.7rem] dark:text-[#ECE7DD]">
            {title}
          </h1>
          <p className="mt-4 text-[20px] leading-relaxed text-warmgray dark:text-[#A8A296]">
            {body.intro}
          </p>

          <div className="mt-10 flex flex-col gap-9">
            {body.sections.map((s) => (
              <section key={s.h}>
                <h2 className="font-display text-[25px] text-night dark:text-[#ECE7DD]">
                  {s.h}
                </h2>
                <p className="mt-3 text-[20px] leading-relaxed text-ink/90 dark:text-[#C7C2B8]">
                  {s.p}
                </p>
              </section>
            ))}
          </div>

          <section className="mt-12 rounded-cardlg border border-sand-300 bg-cream/70 p-6 dark:border-anthracite-600 dark:bg-anthracite-850/70 sm:p-7">
            <p className="lbl text-[12px] text-gold-deep dark:text-gold-light">
              {t("keyPoints")}
            </p>
            <ul className="mt-4 flex flex-col gap-3">
              {body.takeaways.map((point) => (
                <li
                  key={point}
                  className="flex items-start gap-3 text-[18px] leading-relaxed text-night dark:text-[#ECE7DD]"
                >
                  <span
                    aria-hidden
                    className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-gold"
                  />
                  {point}
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-12 overflow-hidden rounded-cardlg bg-gradient-to-br from-navy to-night p-7 text-center sm:p-9">
            <h2 className="font-display text-2xl text-[#F4F1EA]">
              {t("ctaTitle")}
            </h2>
            <p className="mx-auto mt-3 max-w-md text-[17px] leading-relaxed text-[#C9D0DD]">
              {t("ctaBody")}
            </p>
            <Link
              href="/register"
              className="mt-6 inline-flex items-center gap-1.5 rounded-btn bg-gold-light px-6 py-3.5 text-[17px] font-semibold text-anthracite-900 transition-colors hover:bg-gold"
            >
              {t("ctaCta")}
              <Icon name="arrowRight" className="h-4 w-4" strokeWidth={1.9} />
            </Link>
          </section>
        </article>
      </main>
      <MarketingFooter />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  );
}
