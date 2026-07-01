import { setRequestLocale } from "next-intl/server";
import { RegisterForm } from "./register-form";

export default async function RegisterPage(
  props: {
    params: Promise<{ locale: string }>;
  }
) {
  const params = await props.params;
  setRequestLocale(params.locale);
  return <RegisterForm />;
}
