import { setRequestLocale } from "next-intl/server";
import { requireAuthenticatedPageUser } from "@/lib/security/page-auth";
import { getSensitiveDataConsentState } from "@/lib/sensitive-data-consent";
import { PrivacyPanel } from "./privacy-panel";

export default async function PrivacyPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const params = await props.params;
  setRequestLocale(params.locale);
  const user = await requireAuthenticatedPageUser(params.locale);
  const ps = user.privacySettings;
  const sensitiveConsent = await getSensitiveDataConsentState(user.id);
  return (
    <PrivacyPanel
      initial={{
        antiMalaiseEnabled: ps?.antiMalaiseEnabled ?? true,
        invisibleMode: ps?.invisibleMode ?? false,
      }}
      initialSensitiveConsent={sensitiveConsent}
      journalOwnerId={user.id}
      fieldLevels={{
        photo: "AFTER_DIALOGUE",
        legalName: "PRIVATE",
        church: user.faithProfile?.localChurchVisibility ?? "AFTER_DISCERNMENT",
        testimony: user.faithProfile?.testimonyVisibility ?? "AFTER_MATCH",
        children: user.relationshipProfile?.childrenVisibility ?? "AFTER_MATCH",
      }}
    />
  );
}
