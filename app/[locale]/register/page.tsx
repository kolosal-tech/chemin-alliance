import { setRequestLocale } from "next-intl/server";
import { RegisterForm } from "./register-form";

export default function RegisterPage({
  params,
}: {
  params: { locale: string };
}) {
  setRequestLocale(params.locale);
  return <RegisterForm />;
}
