import { setRequestLocale } from "next-intl/server";
import { CoachChat } from "./coach-chat";

export default function CoachAiPage({
  params,
}: {
  params: { locale: string };
}) {
  setRequestLocale(params.locale);
  return <CoachChat />;
}
