import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { ResetPasswordForm } from "./reset-password-form";

export default function ResetPasswordPage({
  params,
}: {
  params: { locale: string };
}) {
  setRequestLocale(params.locale);
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
