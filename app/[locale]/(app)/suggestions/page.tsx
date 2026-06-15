import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePageUser } from "@/lib/security/page-auth";
import { redirect } from "@/i18n/navigation";
import { getSuggestions } from "@/lib/matching";
import { prisma } from "@/lib/db";
import { Link } from "@/i18n/navigation";
import { AllianceThread } from "@/components/AllianceThread";
import { SuggestionCard } from "./suggestion-card";

export default async function SuggestionsPage({
  params,
}: {
  params: { locale: string };
}) {
  setRequestLocale(params.locale);
  const t = await getTranslations();
  const user = await requirePageUser(params.locale);
  if (user.season !== "JOURNEY") {
    redirect({ href: "/couple", locale: params.locale });
  }
  const [suggestions, portraitCount] = await Promise.all([
    getSuggestions(user),
    prisma.agentInsight.count({
      where: { userId: user.id, agentId: "preparation", revokedAt: null },
    }),
  ]);
  const hasPortrait = portraitCount > 0;

  return (
    <main className="px-5 pt-6 safe-top">
      {!hasPortrait && (
        <Link
          href="/preparation"
          className="mb-4 block overflow-hidden rounded-cardlg bg-gradient-to-br from-gold to-gold-deep p-[1.5px] shadow-[0_6px_22px_-8px_rgba(154,123,46,0.55)]"
        >
          <div className="rounded-[16.5px] bg-gradient-to-br from-[#FBF3DC] to-[#F3E6BE] p-4 dark:from-[#2B2410] dark:to-[#211A0B]">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-gradient-to-br from-gold-light to-gold-deep shadow-inner">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M12 3l1.8 4.7L18.5 9l-4.7 1.8L12 15l-1.8-4.2L5.5 9l4.7-1.3L12 3Z" fill="#fff" />
                </svg>
              </span>
              <div className="min-w-0 flex-1">
                <span className="lbl text-[8.5px] text-gold-deep dark:text-gold-light">
                  {t("agents.prep.bannerBadge")}
                </span>
                <p className="font-display text-[16px] leading-tight text-[#5A4718] dark:text-[#E8D9A8]">
                  {t("agents.prep.bannerTitle")}
                </p>
              </div>
            </div>
            <p className="mt-2.5 text-[12.5px] leading-snug text-[#6F5C2E] dark:text-[#C2B488]">
              {t("agents.prep.banner")}
            </p>
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-btnsm bg-gradient-to-r from-gold-deep to-gold px-4 py-2 text-[13px] font-semibold text-white">
              {t("agents.prep.bannerCta")} <span aria-hidden>→</span>
            </span>
          </div>
        </Link>
      )}
      <header className="rounded-cardlg border border-sand-200 bg-cream/80 p-5 dark:border-anthracite-600 dark:bg-anthracite-850/80">
        <h1 className="font-display text-2xl font-medium text-night dark:text-[#ECE7DD]">
          {t("suggestions.title")}
        </h1>
        <div className="mt-3.5 flex items-center gap-3 rounded-btnsm border border-sand-200 bg-surface px-3 py-2.5 dark:border-anthracite-600 dark:bg-anthracite-700">
          <div className="w-20 flex-none">
            <AllianceThread current={1} showLabels={false} />
          </div>
          <div className="flex-1">
            <span className="lbl text-[8.5px] text-gold-deep dark:text-gold-light">
              {t("stages.currentStage")}
            </span>
            <div className="mt-0.5 text-[13px] font-semibold text-night dark:text-[#ECE7DD]">
              {t("stages.DISCOVERY")}
            </div>
          </div>
          <span className="text-xs text-sand-600 dark:text-[#7E7A72]">
            {t("suggestions.profilesCount", { count: suggestions.length })}
          </span>
        </div>
      </header>

      <div className="mt-4 flex flex-col gap-3.5 lg:grid lg:grid-cols-3 lg:items-start">
        {suggestions.length === 0 && (
          <p className="rounded-card border border-sand-200 bg-surface p-5 text-sm text-warmgray dark:border-anthracite-600 dark:bg-anthracite-800 dark:text-[#9A958B]">
            {t("suggestions.empty")}
          </p>
        )}
        {suggestions.map((s, i) => (
          <SuggestionCard
            key={s.id}
            featured={i === 1}
            profile={{
              id: s.id,
              displayName: s.displayName,
              age: s.age,
              isVerified: s.isVerified,
              denomination: s.faithProfile?.denomination ?? null,
              vertical: s.faithProfile?.vertical ?? null,
              maritalStatus: s.relationshipProfile?.maritalStatus ?? null,
              hasChildren: s.relationshipProfile?.hasChildren ?? false,
              intentionStatement:
                s.relationshipProfile?.intentionVisibility === "PUBLIC_CONTROLLED"
                  ? (s.relationshipProfile?.intentionStatement ?? null)
                  : null,
              gradient: i % 3,
            }}
          />
        ))}
      </div>
    </main>
  );
}
