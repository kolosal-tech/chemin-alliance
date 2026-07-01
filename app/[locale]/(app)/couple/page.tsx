import { setRequestLocale } from "next-intl/server";
import { requirePageUser } from "@/lib/security/page-auth";
import { CoupleHome } from "./couple-home";

export default async function CouplePage(props: {
  params: Promise<{ locale: string }>;
}) {
  const params = await props.params;
  setRequestLocale(params.locale);
  const user = await requirePageUser(params.locale);
  return <CoupleHome currentUserId={user.id} />;
}
