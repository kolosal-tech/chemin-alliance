import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePageUser } from "@/lib/security/page-auth";
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
  const suggestions = await getSuggestions(user.id);
  const hasPortrait =
    (await prisma.agentInsight.count({
      where: { userId: user.id, agentId: "preparation", revokedAt: null },
    })) > 0;

  return (
    <main className="px-5 pt-6 safe-top">
      {!hasPortrait && (
        <Link
          href="/preparation"
          className="mb-3.5 flex items-center gap-3 rounded-cardlg border border-gold/40 bg-[#FBF6E9] p-4 dark:border-[#463A1F] dark:bg-[#272117]"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="flex-none" aria-hidden>
            <path d="M12 3l1.8 4.7L18.5 9l-4.7 1.8L12 15l-1.8-4.2L5.5 9l4.7-1.3L12 3Z" fill="#9A7B2E" />
          </svg>
          <span className="flex-1 text-[13px] leading-snug text-[#6F5C2E] dark:text-[#C2B488]">
            {t("agents.prep.banner")}
          </span>
          <span className="lbl flex-none text-[9px] text-gold-ink dark:text-[#E0C77A]">
            {t("agents.prep.bannerCta")} →
          </span>
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
