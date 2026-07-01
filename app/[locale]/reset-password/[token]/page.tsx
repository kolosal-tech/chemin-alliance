import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { ResetPasswordForm } from "../reset-password-form";

// Lien en segment de chemin : `/<locale>/reset-password/<hex>`. Sans `=`, donc
// immunisé contre la corruption quoted-printable des emails. La page historique
// `/<locale>/reset-password?token=<hex>` reste active (liens déjà envoyés).
export default async function ResetPasswordTokenPage(
  props: {
    params: Promise<{ locale: string; token: string }>;
  }
) {
  const params = await props.params;
  setRequestLocale(params.locale);
  return (
    <Suspense>
      <ResetPasswordForm token={params.token} />
    </Suspense>
  );
}
