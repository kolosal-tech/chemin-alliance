import { setRequestLocale } from "next-intl/server";
import { requirePageUser } from "@/lib/security/page-auth";
import { AccountPanel } from "./account-panel";

export default async function AccountPage({
  params,
}: {
  params: { locale: string };
}) {
  setRequestLocale(params.locale);
  const user = await requirePageUser(params.locale);
  return (
    <AccountPanel currentEmail={user.email} isVerified={user.isVerified} />
  );
}
