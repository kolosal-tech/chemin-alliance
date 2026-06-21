import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { Hero } from "@/components/marketing/Hero";
import { StatsBanner } from "@/components/marketing/StatsBanner";
import {
  PressLogos,
  WhyUs,
  JourneySteps,
  ValuesGrid,
  AppDownloadSection,
  MarketingFooter,
} from "@/components/marketing/Sections";
import { LazyTestimonials } from "@/components/marketing/LazyTestimonials";
import { InstallPrompt } from "@/components/InstallPrompt";

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "home" });
  const tc = await getTranslations({
    locale: params.locale,
    namespace: "common",
  });
  const title = `${tc("appName")} - ${t("hero.title")} ${t("hero.titleAccent")}`;
  const description = t("hero.subtitle");
  return {
    title: tc("appName"),
    description,
    openGraph: {
      type: "website",
      title,
      description,
      siteName: tc("appName"),
      locale: params.locale,
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function HomePage({
  params,
}: {
  params: { locale: string };
}) {
  setRequestLocale(params.locale);
  const t = await getTranslations("home.testimonials");

  return (
    <>
      <MarketingHeader />
      <main>
        <Hero />
        <PressLogos />
        <StatsBanner />
        <WhyUs />
        <JourneySteps />
        <ValuesGrid />

        {/* Témoignages - carrousel chargé en différé */}
        <section
          id="testimonials"
          className="scroll-mt-20 border-y border-sand-300/60 bg-cream/60 px-5 py-20 sm:px-6 dark:border-anthracite-700 dark:bg-anthracite-850/60"
        >
          <div className="mx-auto max-w-2xl text-center">
            <p className="lbl text-[10.5px] text-gold-deep dark:text-gold-light">
              {t("kicker")}
            </p>
            <h2 className="mt-3 font-display text-3xl leading-tight text-night sm:text-4xl dark:text-[#ECE7DD]">
              {t("title")}
            </h2>
          </div>
          <LazyTestimonials />
        </section>

        <AppDownloadSection />
      </main>
      <MarketingFooter />
      <InstallPrompt />
    </>
  );
}
