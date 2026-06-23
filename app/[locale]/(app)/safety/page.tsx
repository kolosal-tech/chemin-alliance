import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePageUser } from "@/lib/security/page-auth";

const RED_FLAGS = ["money", "urgency", "offplatform", "identity", "sobstory", "pressure"] as const;
const STEPS = ["never", "slow", "video", "tools", "coach"] as const;

export default async function SafetyPage({
  params,
}: {
  params: { locale: string };
}) {
  setRequestLocale(params.locale);
  await requirePageUser(params.locale);
  const t = await getTranslations("antiScam");

  return (
    <main className="px-3 pt-6 safe-top lg:mx-auto lg:max-w-2xl">
      <h1 className="font-display text-2xl font-medium text-night dark:text-[#ECE7DD]">
        {t("pageTitle")}
      </h1>
      <p className="mt-2 text-[16px] leading-relaxed text-warmgray dark:text-[#9A958B]">
        {t("pageDesc")}
      </p>

      <h2 className="lbl mb-2 mt-5 text-[12px] text-gold-deep dark:text-gold-light">
        {t("redFlagsTitle")}
      </h2>
      <ul className="flex flex-col gap-2">
        {RED_FLAGS.map((k) => (
          <li
            key={k}
            className="flex items-start gap-2.5 rounded-card border border-sand-200 bg-surface p-3.5 text-[16px] text-[#3A372F] dark:border-anthracite-600 dark:bg-anthracite-800 dark:text-[#CFCAC0]"
          >
            <span aria-hidden className="text-danger">
              ⚑
            </span>
            {t(`redFlag_${k}`)}
          </li>
        ))}
      </ul>

      <h2 className="lbl mb-2 mt-5 text-[12px] text-gold-deep dark:text-gold-light">
        {t("stepsTitle")}
      </h2>
      <ol className="flex flex-col gap-2">
        {STEPS.map((k, i) => (
          <li
            key={k}
            className="flex items-start gap-2.5 rounded-card border border-sand-200 bg-surface p-3.5 text-[16px] text-[#3A372F] dark:border-anthracite-600 dark:bg-anthracite-800 dark:text-[#CFCAC0]"
          >
            <span className="font-display text-gold-deep dark:text-gold-light">
              {i + 1}
            </span>
            {t(`step_${k}`)}
          </li>
        ))}
      </ol>

      <p className="mt-5 rounded-card border border-[#CFE0D4] bg-[#EAF0EB] px-3 py-3 text-[15px] leading-normal text-[#2E5440] dark:border-[#2E4A38] dark:bg-[#1B2A20] dark:text-[#9FC7AC]">
        {t("reminder")}
      </p>
    </main>
  );
}
