import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePageUser } from "@/lib/security/page-auth";

export const dynamic = "force-dynamic";

export default async function CoachesPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const params = await props.params;
  setRequestLocale(params.locale);
  await requirePageUser(params.locale);
  const t = await getTranslations("coaches");

  return (
    <main className="px-3 pt-6 safe-top lg:mx-auto lg:max-w-4xl">
      <h1 className="mb-4 font-display text-2xl font-medium text-night dark:text-[#ECE7DD]">
        {t("title")}
      </h1>
      <section
        aria-labelledby="coaches-unavailable-title"
        data-testid="coaches-unavailable"
        className="rounded-cardlg border border-sand-200 bg-surface p-8 text-center dark:border-anthracite-600 dark:bg-anthracite-800"
      >
        <h2
          id="coaches-unavailable-title"
          className="font-display text-xl text-night dark:text-[#ECE7DD]"
        >
          {t("marketplaceUnavailableTitle")}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-warmgray dark:text-[#9A958B]">
          {t("marketplaceUnavailableBody")}
        </p>
      </section>
    </main>
  );
}
