import { setRequestLocale } from "next-intl/server";
import { BlessingForm } from "./blessing-form";

// Page publique du Parrain/Marraine - hors groupe (app), AUCUNE auth de session.
// L'accès est authentifié par le token du lien magique (côté API).
export default function ParrainPage({
  params,
}: {
  params: { locale: string; token: string };
}) {
  setRequestLocale(params.locale);
  return <BlessingForm token={params.token} />;
}
