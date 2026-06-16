import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { ForgotPasswordForm } from "./forgot-password-form";

export default function ForgotPasswordPage({
  params,
}: {
  params: { locale: string };
}) {
  setRequestLocale(params.locale);
  return (
    <Suspense>
      <ForgotPasswordForm />
    </Suspense>
  );
}
