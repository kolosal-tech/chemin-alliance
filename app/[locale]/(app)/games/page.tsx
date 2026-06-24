import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePageUser } from "@/lib/security/page-auth";
import { prisma } from "@/lib/db";
import { Link } from "@/i18n/navigation";

const GRADIENTS = [
  "radial-gradient(120% 100% at 30% 20%, #6E7790 0%, #41506E 55%, #222F4C 100%)",
  "radial-gradient(120% 100% at 35% 25%, #8A7A6A 0%, #5C4D44 55%, #352A28 100%)",
  "radial-gradient(120% 100% at 30% 20%, #6F8478 0%, #43564B 55%, #26342C 100%)",
];

export default async function GamesPage({
  params,
}: {
  params: { locale: string };
}) {
  setRequestLocale(params.locale);
  await requirePageUser(params.locale);
  const t = await getTranslations("alliance_lab");

  const personas = await prisma.aiPersona.findMany({
    where: { active: true },
    orderBy: { createdAt: "asc" },
    select: {
      slug: true,
      displayName: true,
      bio: true,
      avatarGradient: true,
      region: true,
    },
  });

  return (
    <main className="mx-auto max-w-3xl px-3 pt-6 safe-top">
      <header className="rounded-cardlg border border-sand-200 bg-cream/80 p-5 dark:border-anthracite-600 dark:bg-anthracite-850/80">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-medium text-night dark:text-[#ECE7DD]">
            {t("title")}
          </h1>
          <span className="rounded-full border border-gold/40 bg-gold/15 px-2.5 py-0.5 text-[12px] font-semibold text-gold-deep dark:text-gold-light">
            {t("badge.echo")}
          </span>
        </div>
        <p className="mt-1 text-[15px] text-warmgray dark:text-[#9A958B]">
          {t("subtitle")}
        </p>
      </header>

      <h2 className="mt-6 mb-3 px-1 text-[14px] font-semibold text-gold-deep dark:text-gold-light">
        {t("arena.choosePartner")}
      </h2>

      <div className="flex flex-col gap-3.5">
        {personas.map((p) => (
          <article
            key={p.slug}
            className="rounded-cardlg border border-sand-200 bg-surface p-4 dark:border-anthracite-600 dark:bg-anthracite-800"
          >
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className="h-11 w-11 flex-none rounded-full"
                style={{
                  background: GRADIENTS[p.avatarGradient % GRADIENTS.length],
                }}
              />
              <div className="min-w-0 flex-1">
                <p className="text-[16px] font-semibold text-night dark:text-[#ECE7DD]">
                  {p.displayName}
                </p>
                {p.bio && (
                  <p className="truncate text-[14px] text-warmgray dark:text-[#9A958B]">
                    {p.bio}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-3 flex gap-2.5">
              <Link
                href={`/games/play?persona=${p.slug}&game=DISC`}
                className="flex-1 rounded-btn bg-navy py-2.5 text-center text-sm font-semibold text-[#F4F1EA] dark:bg-gold-light dark:text-anthracite-900"
              >
                {t("arena.gameDisc")}
              </Link>
              <Link
                href={`/games/play?persona=${p.slug}&game=DEEP_QUESTIONS`}
                className="flex-1 rounded-btn border border-sand-400 py-2.5 text-center text-sm font-semibold text-night dark:border-anthracite-600 dark:text-[#ECE7DD]"
              >
                {t("arena.gameDeep")}
              </Link>
            </div>
          </article>
        ))}
      </div>

      <p className="mt-5 text-center text-[12px] text-warmgray dark:text-[#8B8579]">
        {t("badge.disclaimer")}
      </p>
    </main>
  );
}
