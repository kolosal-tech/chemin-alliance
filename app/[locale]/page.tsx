import { setRequestLocale } from "next-intl/server";
import { OnboardingSlides } from "./onboarding-slides";

export default function OnboardingPage({
  params,
}: {
  params: { locale: string };
}) {
  setRequestLocale(params.locale);
  return <OnboardingSlides />;
}
