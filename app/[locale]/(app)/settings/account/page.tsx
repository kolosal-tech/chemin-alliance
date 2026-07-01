import { setRequestLocale } from "next-intl/server";
import { requirePageUser } from "@/lib/security/page-auth";
import { AccountPanel } from "./account-panel";

export default async function AccountPage(
  props: {
    params: Promise<{ locale: string }>;
  }
) {
  const params = await props.params;
  setRequestLocale(params.locale);
  const user = await requirePageUser(params.locale);
  return (
    <AccountPanel currentEmail={user.email} isVerified={user.isVerified} />
  );
}
