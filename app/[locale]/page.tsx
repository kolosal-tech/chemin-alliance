import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { Hero } from "@/components/marketing/Hero";
import {
  WhyUs,
  JourneySteps,
  ValuesGrid,
  AppDownloadSection,
  MarketingFooter,
} from "@/components/marketing/Sections";
import { InstallPrompt } from "@/components/InstallPrompt";

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const params = await props.params;
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

export default async function HomePage(props: {
  params: Promise<{ locale: string }>;
}) {
  const params = await props.params;
  setRequestLocale(params.locale);

  return (
    <>
      <MarketingHeader />
      <main>
        <Hero />
        <WhyUs />
        <JourneySteps />
        <ValuesGrid />
        <AppDownloadSection />
      </main>
      <MarketingFooter />
      <InstallPrompt />
    </>
  );
}
