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
import { posts, getPost, localizedContent } from "@/content/blog";

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    posts.map((p) => ({ locale, slug: p.slug })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: { locale: string; slug: string };
}): Promise<Metadata> {
  const post = getPost(params.slug);
  if (!post) return {};
  const c = localizedContent(post, params.locale);
  return {
    title: c.title,
    description: c.excerpt,
    openGraph: {
      type: "article",
      title: c.title,
      description: c.excerpt,
      publishedTime: post.date,
      locale: params.locale,
    },
    twitter: {
      card: "summary_large_image",
      title: c.title,
      description: c.excerpt,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: { locale: string; slug: string };
}) {
  setRequestLocale(params.locale);
  const post = getPost(params.slug);
  if (!post) notFound();
  const c = localizedContent(post, params.locale);
  const t = await getTranslations("pages.blog");
  const format = await getFormatter();

  // schema.org BlogPosting (SEO)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: c.title,
    description: c.excerpt,
    datePublished: post.date,
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
            href="/blog"
            className="inline-flex items-center gap-1.5 text-[16px] font-medium text-warmgray transition-colors hover:text-night dark:text-[#9A958B] dark:hover:text-[#ECE7DD]"
          >
            <Icon
              name="arrowRight"
              className="h-4 w-4 rotate-180"
              strokeWidth={1.8}
            />
            {t("back")}
          </Link>

          <div className="lbl mt-8 text-[12px] text-gold-deep dark:text-gold-light">
            {format.dateTime(new Date(post.date), { dateStyle: "long" })} ·{" "}
            {t("minRead", { min: post.readingMinutes })}
          </div>
          <h1 className="mt-3 font-display text-4xl leading-tight text-night sm:text-[2.7rem] dark:text-[#ECE7DD]">
            {c.title}
          </h1>

          <div
            className={`mt-8 aspect-[16/8] rounded-cardlg bg-gradient-to-br ${post.gradient}`}
          />

          <div className="mt-10 flex flex-col gap-6 text-[20px] leading-relaxed text-ink/90 dark:text-[#C7C2B8]">
            {c.body.map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
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
