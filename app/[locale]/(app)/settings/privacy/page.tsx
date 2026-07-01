import { setRequestLocale } from "next-intl/server";
import { requirePageUser } from "@/lib/security/page-auth";
import { PrivacyPanel } from "./privacy-panel";

export default async function PrivacyPage(
  props: {
    params: Promise<{ locale: string }>;
  }
) {
  const params = await props.params;
  setRequestLocale(params.locale);
  const user = await requirePageUser(params.locale);
  const ps = user.privacySettings;
  return (
    <PrivacyPanel
      initial={{
        antiMalaiseEnabled: ps?.antiMalaiseEnabled ?? true,
        antiMalaiseRadiusKm: ps?.antiMalaiseRadiusKm ?? 25,
        invisibleMode: ps?.invisibleMode ?? false,
      }}
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
