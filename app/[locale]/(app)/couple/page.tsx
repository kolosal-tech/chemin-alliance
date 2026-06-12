import { setRequestLocale } from "next-intl/server";
import { requirePageUser } from "@/lib/security/page-auth";
import { CoupleHome } from "./couple-home";

export default async function CouplePage({
  params,
}: {
  params: { locale: string };
}) {
  setRequestLocale(params.locale);
  await requirePageUser(params.locale);
  return <CoupleHome />;
}
