import { setRequestLocale } from "next-intl/server";
import { requirePageUser } from "@/lib/security/page-auth";
import { INTERVIEW_QUESTIONS } from "@/lib/agents/preparation";
import type { Locale } from "@/lib/core-engine";
import { PreparationFlow } from "./preparation-flow";

export default async function PreparationPage({
  params,
}: {
  params: { locale: string };
}) {
  setRequestLocale(params.locale);
  await requirePageUser(params.locale);
  const locale = params.locale as Locale;
  return (
    <PreparationFlow
      questions={INTERVIEW_QUESTIONS.map((q) => ({
        id: q.id,
        text: q.text[locale] ?? q.text.fr,
      }))}
    />
  );
}
