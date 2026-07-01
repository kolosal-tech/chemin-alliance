import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { ForgotPasswordForm } from "./forgot-password-form";

export default async function ForgotPasswordPage(
  props: {
    params: Promise<{ locale: string }>;
  }
) {
  const params = await props.params;
  setRequestLocale(params.locale);
  return (
    <Suspense>
      <ForgotPasswordForm />
    </Suspense>
  );
}
