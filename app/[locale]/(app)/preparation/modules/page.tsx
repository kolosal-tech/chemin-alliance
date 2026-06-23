import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePageUser } from "@/lib/security/page-auth";
import { prisma } from "@/lib/db";
import { Link } from "@/i18n/navigation";
import { getCurriculum } from "@/lib/curriculum";
import type { Locale } from "@/lib/core-engine";

export const dynamic = "force-dynamic";

export default async function CurriculumPage({
  params,
}: {
  params: { locale: string };
}) {
  setRequestLocale(params.locale);
  const user = await requirePageUser(params.locale);
  const locale = params.locale as Locale;
  const t = await getTranslations("curriculum");
  const ts = await getTranslations("stages");

  const faith = await prisma.faithProfile.findUnique({
    where: { userId: user.id },
    select: { vertical: true },
  });
  const modules = getCurriculum(locale, faith?.vertical ?? null);

  return (
    <main className="px-3 pt-6 safe-top lg:mx-auto lg:max-w-2xl">
      <span className="lbl text-[12px] text-gold-deep dark:text-gold-light">
        {t("kicker")}
      </span>
      <h1 className="mb-1 mt-1 font-display text-[29px] leading-tight text-night dark:text-[#ECE7DD]">
        {t("title")}
      </h1>
      <p className="mt-2 text-[17px] leading-relaxed text-warmgray dark:text-[#9A958B]">
        {t("intro")}
      </p>

      <div className="mt-6 flex flex-col gap-4 pb-10">
        {modules.map((m, i) => (
          <article
            key={m.id}
            className="overflow-hidden rounded-cardlg border border-sand-200 bg-surface dark:border-anthracite-600 dark:bg-anthracite-800"
          >
            <div className="flex items-center gap-3 border-b border-sand-100 bg-[#FBF6E9] px-3 py-3 dark:border-anthracite-700 dark:bg-[#272117]">
              <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-gold text-[16px] font-semibold text-night">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <span className="lbl text-[11px] text-gold-deep dark:text-gold-light">
                  {ts(m.stage)}
                </span>
                <h2 className="font-display text-[21px] leading-tight text-night dark:text-[#ECE7DD]">
                  {m.title}
                </h2>
              </div>
            </div>

            <div className="px-3 py-4">
              <p className="text-[17px] leading-relaxed text-ink dark:text-[#CFCAC0]">
                {m.summary}
              </p>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {m.scripture.map((ref) => (
                  <span
                    key={ref}
                    className="rounded-[7px] bg-[#EAF0EB] px-2 py-1 text-[13px] font-medium text-sage dark:bg-[#1B2A20] dark:text-[#7FA98C]"
                  >
                    {ref}
                  </span>
                ))}
              </div>

              <h3 className="lbl mt-4 text-[11px] text-sand-600 dark:text-[#7E7A72]">
                {t("themes")}
              </h3>
              <ul className="mt-1.5 flex flex-col gap-1.5">
                {m.themes.map((th) => (
                  <li
                    key={th}
                    className="flex gap-2 text-[16px] leading-snug text-warmgray dark:text-[#9A958B]"
                  >
                    <span aria-hidden className="text-gold">
                      •
                    </span>
                    {th}
                  </li>
                ))}
              </ul>

              <h3 className="lbl mt-4 text-[11px] text-sand-600 dark:text-[#7E7A72]">
                {t("reflection")}
              </h3>
              <ul className="mt-1.5 flex flex-col gap-2">
                {m.reflection.map((q) => (
                  <li
                    key={q}
                    className="rounded-btn border border-sand-200 bg-cream/70 px-3 py-2 font-display text-[16px] italic leading-snug text-[#3A372F] dark:border-anthracite-600 dark:bg-anthracite-850/70 dark:text-[#CFCAC0]"
                  >
                    {q}
                  </li>
                ))}
              </ul>

              <div className="mt-4 rounded-btn bg-night px-3.5 py-3 dark:border dark:border-[#283655] dark:bg-[#1B2740]">
                <span className="lbl text-[11px] text-gold-light">
                  {t("practice")}
                </span>
                <p className="mt-1 text-[16px] leading-relaxed text-[#D7DCE6]">
                  {m.practice}
                </p>
              </div>

              {m.verticalNote && (
                <div className="mt-3 rounded-btn border border-gold/40 bg-[#FBF6E9] px-3.5 py-3 dark:border-[#463A1F] dark:bg-[#272117]">
                  <span className="lbl text-[11px] text-gold-deep dark:text-gold-light">
                    {t("churchNote")}
                  </span>
                  <p className="mt-1 text-[15px] leading-relaxed text-[#6F5C2E] dark:text-[#C2B488]">
                    {m.verticalNote}
                  </p>
                </div>
              )}
            </div>
          </article>
        ))}
      </div>

      <Link
        href="/coaches"
        className="mb-10 block rounded-btnlg border border-gold bg-surface py-3.5 text-center text-sm font-semibold text-gold-ink dark:border-[#6A5A2E] dark:bg-anthracite-800 dark:text-[#E0C77A]"
      >
        {t("coachCta")}
      </Link>
    </main>
  );
}
