import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { LoginForm } from "./login-form";

export default function LoginPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
