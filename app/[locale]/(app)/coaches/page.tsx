import { getTranslations, setRequestLocale } from "next-intl/server";

export const dynamic = "force-dynamic";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";

export default async function CoachesPage({
  params,
}: {
  params: { locale: string };
}) {
  setRequestLocale(params.locale);
  const t = await getTranslations("coaches");
  const coaches = await prisma.coach.findMany({
    orderBy: { ratingAvg: "desc" },
  });

  return (
    <main className="px-4 pt-6 safe-top lg:mx-auto lg:max-w-4xl">
      <h1 className="mb-4 font-display text-2xl font-medium text-night dark:text-[#ECE7DD]">
        {t("title")}
      </h1>
      {coaches.length === 0 ? (
        <div
          data-testid="coaches-empty"
          className="rounded-cardlg border border-sand-200 bg-surface p-8 text-center dark:border-anthracite-600 dark:bg-anthracite-800"
        >
          <p className="text-sm text-warmgray dark:text-[#9A958B]">
            {t("empty")}
          </p>
        </div>
      ) : (
        <ul
          data-testid="coaches-list"
          className="flex list-none flex-col gap-3 p-0 lg:grid lg:grid-cols-3"
        >
          {coaches.map((c, i) => (
            <li key={c.id} data-testid="coach-card">
              <Link
                href={`/coaches/${c.id}`}
                aria-label={c.displayName}
                className="flex items-center gap-3.5 rounded-cardlg border border-sand-200 bg-surface p-4 dark:border-anthracite-600 dark:bg-anthracite-800"
              >
                <span
                  aria-hidden
                  className="h-14 w-14 flex-none rounded-card"
                  style={{
                    background: [
                      "radial-gradient(110% 90% at 35% 30%, #6E7790 0%, #41506E 55%, #222F4C 100%)",
                      "radial-gradient(110% 90% at 35% 30%, #8A7A6A 0%, #5C4D44 55%, #352A28 100%)",
                      "radial-gradient(110% 90% at 35% 30%, #6F8478 0%, #43564B 55%, #26342C 100%)",
                    ][i % 3],
                  }}
                />
                <div className="min-w-0 flex-1">
                  <div className="font-display text-[20px] text-night dark:text-[#ECE7DD]">
                    {c.displayName}
                  </div>
                  {c.certified && (
                    <span className="mt-1 inline-flex items-center gap-1 rounded-[8px] border border-gold/50 bg-gold/15 px-2 py-0.5 text-[13px] font-semibold text-gold-ink dark:text-[#E0C77A]">
                      <svg
                        width="11"
                        height="11"
                        viewBox="0 0 24 24"
                        aria-hidden
                      >
                        <path
                          d="M12 2.5l2.4 1.7 2.9-.2 1 2.8 2.4 1.6-.8 2.8.8 2.8-2.4 1.6-1 2.8-2.9-.2L12 21.5l-2.4-1.7-2.9.2-1-2.8L3.3 15.6l.8-2.8-.8-2.8 2.4-1.6 1-2.8 2.9.2L12 2.5Z"
                          fill="#C9A84C"
                        />
                      </svg>
                      {t("certified")}
                    </span>
                  )}
                  <div className="mt-1 truncate text-xs text-sand-600 dark:text-[#7E7A72]">
                    {c.specialties.slice(0, 2).join(" · ")}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-display text-lg text-night dark:text-[#ECE7DD]">
                    {c.pricePerSessionEUR}&nbsp;€
                  </div>
                  <div className="text-[13px] text-sand-600 dark:text-[#7E7A72]">
                    ★ {c.ratingAvg.toFixed(1)}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
