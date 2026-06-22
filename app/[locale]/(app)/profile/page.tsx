import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requirePageUser } from "@/lib/security/page-auth";
import { photoProxyUrl } from "@/lib/storage";
import { LockBadge } from "@/components/LockBadge";
import {
  optionLabel,
  localizeList,
  DENOMINATION_LABELS,
  ENGAGEMENT_LABELS,
  INTEREST_LABELS,
  PERSONALITY_LABELS,
} from "@/lib/profile-options";
import { PhotoHeader } from "./photo-header";
import { LogoutButton } from "./logout-button";

export default async function ProfilePage({
  params,
}: {
  params: { locale: string };
}) {
  setRequestLocale(params.locale);
  const t = await getTranslations();
  const user = await requirePageUser(params.locale);
  const faith = user.faithProfile;
  const rel = user.relationshipProfile;
  const photoUrl = photoProxyUrl(user.photoUrl);

  // Barre de complétion sobre
  const fields = [
    faith?.denomination,
    faith?.ministry,
    faith?.testimonyEncrypted,
    rel?.intentionStatement,
    rel?.familyVisionEncrypted,
    user.cityApprox,
  ];
  const completion = Math.round(
    (fields.filter(Boolean).length / fields.length) * 100,
  );

  return (
    <main className="safe-top lg:mx-auto lg:max-w-2xl">
      <PhotoHeader
        displayName={user.displayName}
        age={user.age}
        isVerified={user.isVerified}
        blurredByDefault={user.photoBlurredByDefault}
        photoUrl={photoUrl}
      />
      <div className="px-5 pt-4">
        <div className="mb-4 flex gap-2">
          {faith?.denomination && (
            <span className="rounded-[9px] bg-navy px-2.5 py-1.5 text-xs font-semibold text-[#E8D9A8] dark:bg-[#222C42] dark:text-[#B9C6E0]">
              {optionLabel(
                faith.denomination,
                DENOMINATION_LABELS,
                params.locale,
              )}
            </span>
          )}
          {user.isVerified && (
            <span className="flex items-center gap-1 rounded-[9px] bg-[#EAF0EB] px-2.5 py-1.5 text-xs font-semibold text-sage dark:bg-[#1B2A20] dark:text-[#7FA98C]">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden
              >
                <path
                  d="M5 13l4 4 10-11"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {t("common.verified")}
            </span>
          )}
        </div>

        <div className="mb-5">
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="lbl text-[12px] text-sand-600 dark:text-[#9A958B]">
              {t("profile.completion")}
            </span>
            <span className="font-mono text-xs text-gold-deep dark:text-gold-light">
              {completion}%
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={completion}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-[5px] overflow-hidden rounded-[3px] bg-sand-300/70 dark:bg-anthracite-600"
          >
            <div
              className="h-full rounded-[3px] bg-gradient-to-r from-gold to-[#B8923A]"
              style={{ width: `${completion}%` }}
            />
          </div>
        </div>

        <Link
          href="/profile/edit"
          className="mb-6 block rounded-btnlg bg-navy py-3.5 text-center text-sm font-semibold text-[#F4F1EA] dark:bg-gold-light dark:text-anthracite-900"
        >
          {t("profile.editProfile")}
        </Link>

        <h2 className="lbl mb-3 text-[12px] text-gold-deep dark:text-gold-light">
          {t("profile.spiritualIdentity")}
        </h2>
        <div className="mb-5 flex flex-col gap-3">
          {faith?.ministry && (
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-ink dark:text-[#ECE7DD]">
                  {faith.ministry}
                </div>
                <div className="text-xs text-sand-600 dark:text-[#7E7A72]">
                  {t("profile.ministry")} ·{" "}
                  {t("profile.engagement", {
                    frequency: faith.engagementFrequency
                      ? optionLabel(
                          faith.engagementFrequency,
                          ENGAGEMENT_LABELS,
                          params.locale,
                        )
                      : "-",
                  })}
                </div>
              </div>
              <LockBadge level="PUBLIC_CONTROLLED" />
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-ink dark:text-[#ECE7DD]">
                {t("profile.localChurch")}
              </div>
              <div className="text-xs text-sand-600 dark:text-[#7E7A72]">
                {t("profile.localChurchMasked", {
                  region: user.cityApprox ?? "-",
                })}
              </div>
            </div>
            <LockBadge
              level={faith?.localChurchVisibility ?? "AFTER_DISCERNMENT"}
            />
          </div>
        </div>

        <h2 className="lbl mb-2.5 text-[12px] text-gold-deep dark:text-gold-light">
          {t("profile.intention")}
        </h2>
        <div className="mb-5 rounded-r-btn border border-l-2 border-sand-200 border-l-gold bg-surface px-4 py-3.5 dark:border-anthracite-600 dark:border-l-gold-light dark:bg-anthracite-800">
          <p className="font-display text-[18px] italic leading-normal text-[#3A372F] dark:text-[#CFCAC0]">
            « {rel?.intentionStatement ?? "-"} »
          </p>
          <div className="mt-2.5 flex items-center gap-1.5">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
            >
              <path
                d="M12 21c-1-6-7-7-7-12a3.5 3.5 0 0 1 7-1 3.5 3.5 0 0 1 7 1c0 5-6 6-7 12Z"
                stroke="#9A7B2E"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-xs font-semibold text-gold-deep dark:text-gold-light">
              {t("profile.intentionMarriage")}
            </span>
          </div>
        </div>

        <h2 className="lbl mb-3 text-[12px] text-gold-deep dark:text-gold-light">
          {t("profile.familyVision")}
        </h2>
        <div className="flex items-center justify-between gap-3 pb-6">
          <div>
            <div className="text-sm font-medium text-ink dark:text-[#ECE7DD]">
              {rel?.wantsChildren
                ? t("profile.wantsChildren")
                : t(`profile.${statusKey(rel?.maritalStatus)}`)}
              {rel?.acceptsChildren ? ` · ${t("profile.acceptsChildren")}` : ""}
            </div>
            <div className="text-xs text-sand-600 dark:text-[#7E7A72]">
              {t("profile.faithEducation")}
            </div>
          </div>
          <LockBadge level={rel?.familyVisionVisibility ?? "AFTER_DIALOGUE"} />
        </div>

        {(rel?.interests || rel?.personality || rel?.aspirations) && (
          <>
            <h2 className="lbl mb-3 text-[12px] text-gold-deep dark:text-gold-light">
              {t("profile.aboutMe")}
            </h2>
            <div className="mb-6 flex flex-col gap-3.5 text-sm">
              {rel?.interests && (
                <div>
                  <div className="text-xs font-semibold text-gold-deep dark:text-gold-light">
                    {t("profile.interestsLabel")}
                  </div>
                  <p className="mt-0.5 leading-normal text-ink dark:text-[#ECE7DD]">
                    {localizeList(
                      rel.interests,
                      INTEREST_LABELS,
                      params.locale,
                    )}
                  </p>
                </div>
              )}
              {rel?.personality && (
                <div>
                  <div className="text-xs font-semibold text-gold-deep dark:text-gold-light">
                    {t("profile.personalityLabel")}
                  </div>
                  <p className="mt-0.5 leading-normal text-ink dark:text-[#ECE7DD]">
                    {localizeList(
                      rel.personality,
                      PERSONALITY_LABELS,
                      params.locale,
                    )}
                  </p>
                </div>
              )}
              {rel?.aspirations && (
                <div>
                  <div className="text-xs font-semibold text-gold-deep dark:text-gold-light">
                    {t("profile.aspirationsLabel")}
                  </div>
                  <p className="mt-0.5 leading-normal text-ink dark:text-[#ECE7DD]">
                    {rel.aspirations}
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        <LogoutButton />
      </div>
    </main>
  );
}

function statusKey(s?: string | null) {
  return s === "widowed"
    ? "widowed"
    : s === "divorced"
      ? "divorced"
      : s === "single_parent"
        ? "singleParent"
        : s === "engaged"
          ? "engaged"
          : s === "married"
            ? "married"
            : "single";
}
