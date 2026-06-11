import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePageUser } from "@/lib/security/page-auth";
import { getSuggestions } from "@/lib/matching";
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

  return (
    <main className="px-5 pt-6 safe-top">
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
