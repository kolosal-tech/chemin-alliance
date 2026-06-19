import type { Metadata } from "next";
import {
  getTranslations,
  setRequestLocale,
  getFormatter,
} from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/Sections";
import { Icon } from "@/components/marketing/icons";
import { posts, localizedContent } from "@/content/blog";

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({
    locale: params.locale,
    namespace: "pages.blog",
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

export default async function BlogIndexPage({
  params,
}: {
  params: { locale: string };
}) {
  setRequestLocale(params.locale);
  const t = await getTranslations("pages.blog");
  const format = await getFormatter();

  return (
    <>
      <MarketingHeader />
      <main>
        <section className="mx-auto max-w-3xl px-5 py-16 text-center sm:px-6 sm:py-20">
          <p className="lbl text-[10.5px] text-gold-deep dark:text-gold-light">
            {t("kicker")}
          </p>
          <h1 className="mt-4 font-display text-4xl leading-tight text-night sm:text-5xl dark:text-[#ECE7DD]">
            {t("title")}
          </h1>
          <p className="mt-5 text-[16px] leading-relaxed text-warmgray dark:text-[#A8A296]">
            {t("subtitle")}
          </p>
        </section>

        <section className="mx-auto max-w-5xl px-5 pb-24 sm:px-6">
          {posts.length === 0 ? (
            <p className="text-center text-warmgray dark:text-[#9A958B]">
              {t("empty")}
            </p>
          ) : (
            <ul className="grid gap-6 sm:grid-cols-2">
              {posts.map((post) => {
                const c = localizedContent(post, params.locale);
                return (
                  <li key={post.slug}>
                    <Link
                      href={`/blog/${post.slug}`}
                      className="group flex h-full flex-col overflow-hidden rounded-cardlg border border-sand-300 bg-surface transition-shadow hover:shadow-cardfeat dark:border-anthracite-600 dark:bg-anthracite-800"
                    >
                      <div
                        className={`relative aspect-[16/9] bg-gradient-to-br ${post.gradient}`}
                      >
                        <Icon
                          name="sparkle"
                          className="absolute bottom-4 right-4 h-7 w-7 text-gold-light/70"
                          strokeWidth={1.4}
                        />
                      </div>
                      <div className="flex flex-1 flex-col p-6">
                        <div className="lbl text-[10px] text-sand-600 dark:text-[#7E7A72]">
                          {format.dateTime(new Date(post.date), {
                            dateStyle: "long",
                          })}{" "}
                          · {t("minRead", { min: post.readingMinutes })}
                        </div>
                        <h2 className="mt-3 font-display text-2xl leading-snug text-night dark:text-[#ECE7DD]">
                          {c.title}
                        </h2>
                        <p className="mt-2 flex-1 text-[14.5px] leading-relaxed text-warmgray dark:text-[#9A958B]">
                          {c.excerpt}
                        </p>
                        <span className="mt-5 inline-flex items-center gap-1.5 text-[14px] font-semibold text-navy group-hover:gap-2.5 dark:text-gold-light">
                          {t("readMore")}
                          <Icon
                            name="arrowRight"
                            className="h-4 w-4 transition-all"
                            strokeWidth={1.9}
                          />
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
      <MarketingFooter />
    </>
  );
}
