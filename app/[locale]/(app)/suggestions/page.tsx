import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePageUser } from "@/lib/security/page-auth";
import { redirect } from "@/i18n/navigation";
import {
  getSuggestions,
  missingMinimumProfile,
  compatibilityTopics,
  getDiscoveryPreview,
} from "@/lib/matching";
import { prisma } from "@/lib/db";
import { Link } from "@/i18n/navigation";
import { AllianceThread } from "@/components/AllianceThread";
import { SuggestionCard } from "./suggestion-card";
import { isProfileGateEnabled } from "@/lib/flags";
import {
  profileCompletion,
  matchingGateBlocked,
} from "@/lib/profile-completion";
import { OnboardingProgress } from "@/components/OnboardingProgress";
import { IncompleteProfileModal } from "@/components/IncompleteProfileModal";
import { OnboardingIntroCard } from "@/components/OnboardingIntroCard";
import { SuggestionsVerifyNotice } from "@/components/SuggestionsVerifyNotice";
import { DiscoveryPreview } from "@/components/DiscoveryPreview";
import { parseFilters, matchesFilters, activeFilterCount } from "@/lib/filters";
import { FiltersDrawer } from "@/components/product/FiltersDrawer";
import { SafetyBlock } from "@/components/product/SafetyBlock";

export default async function SuggestionsPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams?: {
    ageMin?: string;
    ageMax?: string;
    verified?: string;
    children?: string;
  };
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
  // P3 : aperçu de découverte pré-vérification (silhouettes anonymisées) pour
  // les comptes non vérifiés - une seule requête, et seulement dans ce cas.
  const discoveryPreview = user.isVerified
    ? []
    : await getDiscoveryPreview(user);
  // Gate profil minimum : si ville/intention manquent, getSuggestions renvoie []
  // ET on affiche un appel à compléter plutôt que « pas de suggestion ».
  const missing = missingMinimumProfile(user);
  // Phase 2 (flag OFF par défaut) : si activé et profil incomplet, on remplace
  // la liste par la jauge d'onboarding + modale. Flag OFF ⇒ branche inchangée.
  const completion = profileCompletion(user);
  const onboardingDone = user.onboardingDoneAt != null;
  const gateActive = matchingGateBlocked({
    gateEnabled: isProfileGateEnabled(),
    completion,
    onboardingDone,
  });

  // Filtres (Deliverable 4) : portés par l'URL, validés Zod, appliqués à la
  // liste DÉJÀ retournée par getSuggestions (aucune touche au moteur de match).
  const filters = parseFilters(searchParams);
  const filterCount = activeFilterCount(filters);
  const shown = suggestions.filter((s) =>
    matchesFilters(
      {
        age: s.age,
        isVerified: s.isVerified,
        hasChildren: s.relationshipProfile?.hasChildren ?? false,
      },
      filters,
    ),
  );

  return (
    <main className="px-3 pt-6 safe-top">
      {/* Bannière « entretien » seulement APRÈS le bilan de maturité, pour ne pas
          présenter deux questionnaires concurrents à un nouvel inscrit : il fait
          d'abord son bilan (OnboardingIntroCard), puis on l'invite au portrait. */}
      {/* P4 : enrichissement OPTIONNEL (entretien/portrait Coach IA), pas un 2e
          questionnaire obligatoire. Visuel sobre (carte de surface, pas le gold
          d'une action principale), copie repositionnée en « optionnel ». */}
      {onboardingDone && !hasPortrait && (
        <Link
          href="/preparation"
          className="mb-4 block rounded-cardlg border border-sand-200 bg-surface p-4 transition-colors hover:border-gold/50 dark:border-anthracite-600 dark:bg-anthracite-800 dark:hover:border-gold-light/40"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-gold/15 text-gold-deep dark:text-gold-light">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden
              >
                <path
                  d="M12 3l1.8 4.7L18.5 9l-4.7 1.8L12 15l-1.8-4.2L5.5 9l4.7-1.3L12 3Z"
                  fill="currentColor"
                />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <span className="lbl text-[11px] text-gold-deep dark:text-gold-light">
                {t("agents.prep.bannerBadge")}
              </span>
              <p className="font-display text-[18px] leading-tight text-night dark:text-[#ECE7DD]">
                {t("agents.prep.bannerTitle")}
              </p>
            </div>
            <span
              aria-hidden
              className="flex-none text-[18px] text-gold-deep dark:text-gold-light"
            >
              ›
            </span>
          </div>
          <p className="mt-2 text-[15px] leading-snug text-warmgray dark:text-[#9A958B]">
            {t("agents.prep.banner")}
          </p>
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
            <span className="lbl text-[11px] text-gold-deep dark:text-gold-light">
              {t("stages.currentStage")}
            </span>
            <div className="mt-0.5 text-[16px] font-semibold text-night dark:text-[#ECE7DD]">
              {t("stages.DISCOVERY")}
            </div>
          </div>
          <span className="text-xs text-sand-600 dark:text-[#7E7A72]">
            {t("suggestions.profilesCount", { count: shown.length })}
          </span>
        </div>
      </header>

      {!onboardingDone && !hasPortrait ? (
        // Bilan de maturité (« recto-verso ») : affiché une fois tant que le
        // portrait n'existe pas. Une fois l'entretien fait (portrait présent),
        // on n'invite plus à « commencer ton bilan » même si onboardingDoneAt
        // n'a pas été posé - sinon l'utilisateur croit devoir tout recommencer.
        <div className="mt-4">
          <OnboardingIntroCard />
        </div>
      ) : gateActive ? (
        <div className="mt-4">
          <OnboardingProgress completion={completion} />
          <IncompleteProfileModal completion={completion} />
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-3.5 lg:grid lg:grid-cols-3 lg:items-start">
          {missing.length === 0 &&
            (suggestions.length > 0 || filterCount > 0) && (
              <div className="flex items-center justify-between gap-3 lg:col-span-3">
                <p className="text-[16px] text-warmgray dark:text-[#9A958B]">
                  {t("suggestions.profilesCount", { count: shown.length })}
                </p>
                <FiltersDrawer activeCount={filterCount} />
              </div>
            )}
          {missing.length > 0 && (
            <div className="rounded-card border border-sand-200 bg-surface p-5 dark:border-anthracite-600 dark:bg-anthracite-800 lg:col-span-3">
              <h2 className="font-display text-lg text-night dark:text-[#ECE7DD]">
                {t("suggestions.completeTitle")}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-warmgray dark:text-[#9A958B]">
                {t("suggestions.completeBody")}
              </p>
              <ul className="mt-3 flex flex-col gap-1.5">
                {missing.includes("city") && (
                  <li className="flex items-center gap-2 text-[16px] text-night dark:text-[#ECE7DD]">
                    <span
                      aria-hidden
                      className="text-gold-deep dark:text-gold-light"
                    >
                      ○
                    </span>
                    {t("suggestions.needCity")}
                  </li>
                )}
                {missing.includes("intention") && (
                  <li className="flex items-center gap-2 text-[16px] text-night dark:text-[#ECE7DD]">
                    <span
                      aria-hidden
                      className="text-gold-deep dark:text-gold-light"
                    >
                      ○
                    </span>
                    {t("suggestions.needIntention")}
                  </li>
                )}
              </ul>
              <Link
                href="/profile/edit"
                className="mt-4 inline-flex items-center gap-1.5 rounded-btnsm bg-navy px-3 py-2.5 text-[16px] font-semibold text-[#F4F1EA] dark:bg-gold-light dark:text-anthracite-900"
              >
                {t("suggestions.completeCta")} <span aria-hidden>→</span>
              </Link>
            </div>
          )}
          {missing.length === 0 &&
            shown.length === 0 &&
            (!user.isVerified ? (
              // Liste vide car email non vérifié (matching renvoie [] tant que
              // !isVerified). P3 : on montre un aperçu de silhouettes (vivier
              // vivant) + la vraie cause avec CTA de renvoi, plutôt que le
              // générique "pas de suggestion aujourd'hui".
              <div className="flex flex-col gap-3 lg:col-span-3">
                <DiscoveryPreview teasers={discoveryPreview} />
                <SuggestionsVerifyNotice />
              </div>
            ) : (
              <p className="rounded-card border border-sand-200 bg-surface p-5 text-sm text-warmgray dark:border-anthracite-600 dark:bg-anthracite-800 dark:text-[#9A958B] lg:col-span-3">
                {t("suggestions.empty")}
              </p>
            ))}
          {missing.length === 0 &&
            shown.map((s, i) => (
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
                    s.relationshipProfile?.intentionVisibility ===
                    "PUBLIC_CONTROLLED"
                      ? (s.relationshipProfile?.intentionStatement ?? null)
                      : null,
                  gradient: i % 3,
                  photoBlurhash: s.photoBlurhash ?? null,
                  // P2 : axes de compatibilité viewer<->candidat pour le radar.
                  axes: compatibilityTopics(user, s).axes,
                  // P6 : signal de confiance "accompagné·e" (a un Parrain/Marraine).
                  hasSponsor: s.sponsor != null,
                  // Ecosysteme : Compagnon IA (badge clair dans la carte).
                  kind: s.kind,
                }}
              />
            ))}
          {missing.length === 0 && (
            <div className="lg:col-span-3">
              <SafetyBlock />
            </div>
          )}
        </div>
      )}
    </main>
  );
}
