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
import {
  posts,
  categories,
  localizedContent,
  type CategoryId,
} from "@/content/blog";

/** Articles par page (la pagination ne s'affiche qu'au-delà de ce seuil). */
const PAGE_SIZE = 6;

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
  searchParams,
}: {
  params: { locale: string };
  searchParams?: { cat?: string; page?: string };
}) {
  setRequestLocale(params.locale);
  const t = await getTranslations("pages.blog");
  const format = await getFormatter();

  // Filtre catégorie (validé contre la liste connue) + tri par date décroissante.
  const catParam = searchParams?.cat;
  const activeCat: CategoryId | null = (
    categories as readonly string[]
  ).includes(catParam ?? "")
    ? (catParam as CategoryId)
    : null;
  const filtered = [...posts]
    .filter((p) => !activeCat || p.category === activeCat)
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  // Pagination défensive : page bornée à [1, totalPages].
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const rawPage = Number(searchParams?.page);
  const page =
    Number.isInteger(rawPage) && rawPage > 0
      ? Math.min(rawPage, totalPages)
      : 1;
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const catHref = (c: CategoryId | null) => (c ? `/blog?cat=${c}` : "/blog");
  const pageHref = (p: number) => {
    const q = new URLSearchParams();
    if (activeCat) q.set("cat", activeCat);
    if (p > 1) q.set("page", String(p));
    const s = q.toString();
    return s ? `/blog?${s}` : "/blog";
  };

  const chip = (active: boolean) =>
    `rounded-full px-4 py-2 text-[13px] font-semibold transition-colors ${
      active
        ? "bg-navy text-[#F4F1EA] dark:bg-gold-light dark:text-anthracite-900"
        : "border border-sand-300 bg-surface text-warmgray hover:text-night dark:border-anthracite-600 dark:bg-anthracite-800 dark:text-[#9A958B] dark:hover:text-[#ECE7DD]"
    }`;

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
          <nav
            aria-label={t("kicker")}
            className="mb-10 flex flex-wrap justify-center gap-2.5"
          >
            <Link href={catHref(null)} className={chip(activeCat === null)}>
              {t("allLabel")}
            </Link>
            {categories.map((c) => (
              <Link key={c} href={catHref(c)} className={chip(activeCat === c)}>
                {t(`categories.${c}`)}
              </Link>
            ))}
          </nav>

          {visible.length === 0 ? (
            <p className="text-center text-warmgray dark:text-[#9A958B]">
              {t("empty")}
            </p>
          ) : (
            <ul className="grid gap-6 sm:grid-cols-2">
              {visible.map((post) => {
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
                        <span className="lbl absolute left-4 top-4 rounded-full bg-black/25 px-2.5 py-1 text-[9px] text-[#F4F1EA] backdrop-blur">
                          {t(`categories.${post.category}`)}
                        </span>
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

          {totalPages > 1 && (
            <nav className="mt-12 flex items-center justify-center gap-4">
              {page > 1 ? (
                <Link
                  href={pageHref(page - 1)}
                  className="inline-flex items-center gap-1.5 rounded-btnsm border border-sand-300 px-4 py-2.5 text-[13px] font-semibold text-night dark:border-anthracite-600 dark:text-[#ECE7DD]"
                >
                  <Icon
                    name="arrowRight"
                    className="h-4 w-4 rotate-180"
                    strokeWidth={1.8}
                  />
                  {t("prev")}
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-btnsm border border-sand-200 px-4 py-2.5 text-[13px] font-semibold text-sand-400 dark:border-anthracite-700 dark:text-[#56524B]">
                  <Icon
                    name="arrowRight"
                    className="h-4 w-4 rotate-180"
                    strokeWidth={1.8}
                  />
                  {t("prev")}
                </span>
              )}
              <span className="text-[13px] text-warmgray dark:text-[#9A958B]">
                {page} / {totalPages}
              </span>
              {page < totalPages ? (
                <Link
                  href={pageHref(page + 1)}
                  className="inline-flex items-center gap-1.5 rounded-btnsm border border-sand-300 px-4 py-2.5 text-[13px] font-semibold text-night dark:border-anthracite-600 dark:text-[#ECE7DD]"
                >
                  {t("next")}
                  <Icon
                    name="arrowRight"
                    className="h-4 w-4"
                    strokeWidth={1.8}
                  />
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-btnsm border border-sand-200 px-4 py-2.5 text-[13px] font-semibold text-sand-400 dark:border-anthracite-700 dark:text-[#56524B]">
                  {t("next")}
                  <Icon
                    name="arrowRight"
                    className="h-4 w-4"
                    strokeWidth={1.8}
                  />
                </span>
              )}
            </nav>
          )}
        </section>
      </main>
      <MarketingFooter />
    </>
  );
}
