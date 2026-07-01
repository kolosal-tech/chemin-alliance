import { setRequestLocale } from "next-intl/server";
import { requirePageUser } from "@/lib/security/page-auth";
import { NotificationsPanel } from "./notifications-panel";

export default async function NotificationsPage(
  props: {
    params: Promise<{ locale: string }>;
  }
) {
  const params = await props.params;
  setRequestLocale(params.locale);
  await requirePageUser(params.locale);
  // Push dormant tant que la paire VAPID n'est pas configurée côté serveur.
  const serverEnabled = Boolean(
    process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY &&
    process.env.WEB_PUSH_PRIVATE_KEY,
  );
  return <NotificationsPanel serverEnabled={serverEnabled} />;
}
