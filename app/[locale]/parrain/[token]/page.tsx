import { setRequestLocale } from "next-intl/server";
import { BlessingForm } from "./blessing-form";

// Page publique du Parrain/Marraine - hors groupe (app), AUCUNE auth de session.
// L'accès est authentifié par le token du lien magique (côté API).
export default async function ParrainPage(
  props: {
    params: Promise<{ locale: string; token: string }>;
  }
) {
  const params = await props.params;
  setRequestLocale(params.locale);
  return <BlessingForm token={params.token} />;
}
