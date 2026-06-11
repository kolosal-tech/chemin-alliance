import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePageUser } from "@/lib/security/page-auth";
import { consolationWord, REBUILDING_STEPS } from "@/lib/agents/rebuilding";
import { SacredMotif } from "@/components/SacredMotif";
import type { Locale } from "@/lib/core-engine";
import { Link } from "@/i18n/navigation";

export default async function RebuildingPage({
  params,
}: {
  params: { locale: string };
}) {
  setRequestLocale(params.locale);
  await requirePageUser(params.locale);
  const t = await getTranslations("agents.rebuild");
  const tCoach = await getTranslations("aiCoach");
  const locale = params.locale as Locale;
  const steps = REBUILDING_STEPS[locale];
  const word = await consolationWord(locale);

  return (
    <main className="relative px-5 pt-6 safe-top lg:mx-auto lg:max-w-2xl">
      <SacredMotif variant="olive" className="right-[-110px] top-[60px]" />
      <h1 className="font-display text-[26px] text-night dark:text-[#ECE7DD]">{t("title")}</h1>
      {word && (
        <div className="mt-4 rounded-cardlg bg-night p-5 dark:border dark:border-[#283655] dark:bg-[#1B2740]">
          <span className="lbl text-[9px] text-gold dark:text-gold-light">{t("wordTitle")}</span>
          <p className="mt-2 font-display text-[16px] italic leading-relaxed text-[#D7DCE6]">{word}</p>
        </div>
      )}
      <ol className="mt-5 flex flex-col gap-3 pb-6">
        {steps.map((s, i) => (
          <li key={s.title} className="flex gap-4 rounded-cardlg border border-sand-200 bg-surface p-4.5 p-5 dark:border-anthracite-600 dark:bg-anthracite-800">
            <span className="lbl mt-1 flex-none text-[11px] text-gold-deep dark:text-gold-light">0{i + 1}</span>
            <div>
              <div className="font-display text-[18px] text-night dark:text-[#ECE7DD]">{s.title}</div>
              <p className="mt-1 text-[13.5px] leading-normal text-warmgray dark:text-[#9A958B]">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <Link
        href="/coaches"
        className="mb-8 block rounded-btnlg bg-navy py-4 text-center text-base font-semibold text-[#F4F1EA] dark:bg-gold-light dark:text-anthracite-900"
      >
        {tCoach("guardrailCta")}
      </Link>
    </main>
  );
}
