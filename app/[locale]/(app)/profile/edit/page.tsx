import { setRequestLocale } from "next-intl/server";
import { requirePageUser } from "@/lib/security/page-auth";
import { EditProfileForm } from "./edit-profile-form";

export default async function EditProfilePage({
  params,
}: {
  params: { locale: string };
}) {
  setRequestLocale(params.locale);
  await requirePageUser(params.locale);
  return <EditProfileForm />;
}
