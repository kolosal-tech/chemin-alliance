import { setRequestLocale } from "next-intl/server";
import { OnboardingSlides } from "../onboarding-slides";

/**
 * Parcours d'onboarding (anciennement à la racine `/`). La racine présente
 * désormais la landing marketing ; le CTA « Commencer le parcours » y mène.
 */
export default async function WelcomePage(
  props: {
    params: Promise<{ locale: string }>;
  }
) {
  const params = await props.params;
  setRequestLocale(params.locale);
  return <OnboardingSlides />;
}
