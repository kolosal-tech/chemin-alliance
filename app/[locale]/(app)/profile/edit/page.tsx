import { setRequestLocale } from "next-intl/server";
import { requirePageUser } from "@/lib/security/page-auth";
import { EditProfileForm } from "./edit-profile-form";

export default async function EditProfilePage(
  props: {
    params: Promise<{ locale: string }>;
  }
) {
  const params = await props.params;
  setRequestLocale(params.locale);
  await requirePageUser(params.locale);
  // Upload photo dormant tant que Supabase Storage n'est pas configuré.
  const photoEnabled = Boolean(
    process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  return <EditProfileForm photoEnabled={photoEnabled} />;
}
