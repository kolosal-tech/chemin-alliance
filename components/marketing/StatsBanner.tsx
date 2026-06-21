import { getTranslations, getLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { stats, type StatId } from "@/content/home";

/**
 * Bandeau de preuve sociale. Lit les compteurs réels depuis Prisma quand
 * c'est possible ; retombe sur les placeholders de `content/home.ts` si la
 * base est injoignable (build/dev) OU si le réel est encore sous le seuil
 * (on ne montre jamais un chiffre marketing en deçà du placeholder).
 * Aucune donnée nominative n'est lue - seulement des `count()`.
 */
async function liveCounts(): Promise<Partial<Record<StatId, number>>> {
  try {
    const [members, alliances, messages] = await Promise.all([
      prisma.user.count(),
      prisma.match.count(),
      prisma.message.count(),
    ]);
    return { members, alliances, messages };
  } catch {
    return {}; // DB indisponible → placeholders
  }
}

function formatValue(
  raw: number,
  locale: string,
  opts: { roundTo?: number; decimals?: number; suffix?: string },
) {
  let v = raw;
  if (opts.roundTo) v = Math.floor(v / opts.roundTo) * opts.roundTo;
  const nf = new Intl.NumberFormat(locale, {
    minimumFractionDigits: opts.decimals ?? 0,
    maximumFractionDigits: opts.decimals ?? 0,
  });
  return `${nf.format(v)}${opts.suffix ?? ""}`;
}

export async function StatsBanner() {
  const t = await getTranslations("home.stats");
  const locale = await getLocale();
  const live = await liveCounts();

  return (
    <section className="border-y border-sand-300/60 bg-night text-cream dark:border-anthracite-700 dark:bg-anthracite-850">
      <div className="mx-auto max-w-6xl px-5 py-12 sm:px-6 sm:py-14">
        <p className="lbl mb-8 text-center text-[10.5px] text-gold-light/90">
          {t("kicker")}
        </p>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-9 sm:gap-y-10 lg:grid-cols-4">
          {stats.map((s) => {
            const liveVal = s.prismaCount ? live[s.id] : undefined;
            const value =
              liveVal !== undefined
                ? Math.max(liveVal, s.fallback)
                : s.fallback;
            return (
              <div key={s.id} className="text-center">
                <dd className="font-display text-4xl font-medium text-gold-light sm:text-5xl">
                  {formatValue(value, locale, {
                    roundTo: s.roundTo,
                    decimals: s.decimals,
                    suffix: s.suffix,
                  })}
                </dd>
                <dt className="mt-2 text-[13px] font-medium text-[#C7CBD6] sm:text-sm">
                  {t(s.id)}
                </dt>
              </div>
            );
          })}
        </dl>
      </div>
    </section>
  );
}
