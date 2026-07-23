import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { requirePageUser } from "@/lib/security/page-auth";
import { buildMatchProfileView } from "@/lib/match-profile";
import { activeMatchGrantsProfileVisibility } from "@/lib/matching";
import {
  localizeList,
  INTEREST_LABELS,
  PERSONALITY_LABELS,
} from "@/lib/profile-options";
import { decryptOptional } from "@/lib/security/crypto";
import { TrustBadge } from "@/components/TrustBadge";
import { MemberAvatar } from "@/components/MemberAvatar";
import { BlessingRequest } from "./blessing-request";
import { activeMatchMemberWhere } from "@/lib/alliance";

// Étape d'alliance (1..3) → clé de stage, pour le libellé « se révèle à… ».
const STEP_STAGE: Record<number, string> = {
  1: "DISCOVERY",
  2: "DIALOGUE",
  3: "DISCERNMENT",
};

// Champs du membre "other" réellement consommés par buildMatchProfileView
// (lib/match-profile.ts) + le JSX direct de cette page. On ne sait pas encore,
// au moment de la requête, si userA ou userB sera "other" (dépend de user.id,
// chargé en parallèle) : les deux membres reçoivent donc le même select
// symétrique. Aucun champ *Encrypted non utilisé n'est chargé.
const MEMBER_SELECT = {
  id: true,
  displayName: true,
  age: true,
  cityApprox: true,
  photoBlurhash: true,
  isVerified: true,
  phoneVerified: true,
  sponsor: { select: { relation: true } },
  faithProfile: {
    select: {
      testimonyEncrypted: true,
      testimonyVisibility: true,
      localChurchEncrypted: true,
      localChurchVisibility: true,
    },
  },
  relationshipProfile: {
    select: {
      intentionStatement: true,
      intentionVisibility: true,
      hasChildren: true,
      childrenVisibility: true,
      familyVisionEncrypted: true,
      familyVisionVisibility: true,
      interests: true,
      personality: true,
      aspirations: true,
    },
  },
} as const;

export default async function MatchProfilePage(props: {
  params: Promise<{ locale: string; matchId: string }>;
}) {
  const params = await props.params;
  setRequestLocale(params.locale);
  const t = await getTranslations();
  const user = await requirePageUser(params.locale);
  const match = await prisma.match.findFirst({
    where: activeMatchMemberWhere(params.matchId, user.id),
    select: {
      id: true,
      userAId: true,
      userBId: true,
      status: true,
      stage: true,
      userA: { select: MEMBER_SELECT },
      userB: { select: MEMBER_SELECT },
    },
  });
  if (!match) {
    notFound();
  }

  const other = match.userAId === user.id ? match.userB : match.userA;
  const fields = buildMatchProfileView(
    { faith: other.faithProfile, relationship: other.relationshipProfile },
    {
      matched: activeMatchGrantsProfileVisibility(match.status),
      stage: match.stage,
    },
  );

  // Ma demande de bénédiction pour CE match (la plus récente) : dépend de
  // match.id (résultat de la requête ci-dessus) → reste APRÈS, non parallélisé.
  const myBlessing = await prisma.blessing.findFirst({
    where: {
      userId: user.id,
      matchId: match.id,
      OR: [
        { status: { in: ["BLESSED", "CAUTION"] } },
        {
          status: "PENDING",
          emailSentAt: { not: null },
          expiresAt: { gt: new Date() },
        },
      ],
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="px-3 pt-5 safe-top lg:mx-auto lg:max-w-2xl">
      <header className="mb-4 flex items-center gap-3">
        <Link
          href={`/alliance/${match.id}`}
          aria-label={t("common.back")}
          className="p-1"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <path
              d="M15 5l-7 7 7 7"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-warmgray dark:text-[#9A958B]"
            />
          </svg>
        </Link>
        <MemberAvatar
          userId={other.id}
          photoBlurhash={other.photoBlurhash}
          className="h-16 w-16 flex-none rounded-2xl"
        />
        <div>
          <div className="lbl text-[11px] text-gold-deep dark:text-gold-light">
            {t("matchProfile.eyebrow")}
          </div>
          <div className="font-display text-lg text-night dark:text-[#ECE7DD]">
            {other.displayName}
            {other.age ? `, ${other.age}` : ""}
          </div>
          {other.cityApprox && (
            <div className="text-[15px] text-sand-600 dark:text-[#9A958B]">
              {other.cityApprox}
            </div>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <TrustBadge
              emailVerified={other.isVerified}
              phoneVerified={other.phoneVerified}
              size="sm"
            />
            {other.sponsor && (
              <span className="inline-flex items-center gap-1 rounded-[6px] bg-gold/15 px-2 py-0.5 text-[12px] font-semibold text-gold-ink dark:bg-[#272117] dark:text-[#E0C77A]">
                🤝 {t("sponsor.badge")}
              </span>
            )}
          </div>
        </div>
      </header>

      <p className="mb-4 rounded-card border border-sand-200 bg-surface px-3 py-3 text-[15px] leading-normal text-sand-700 dark:border-anthracite-600 dark:bg-anthracite-800 dark:text-[#B6B1A7]">
        {t("matchProfile.intro")}
      </p>

      {fields.length === 0 ? (
        <p className="rounded-card bg-sand-100 px-3 py-6 text-center text-[16px] text-sand-600 dark:bg-anthracite-800 dark:text-[#9A958B]">
          {t("matchProfile.empty")}
        </p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {fields.map((f) => (
            <li
              key={f.key}
              className="rounded-card border border-sand-200 bg-surface p-4 dark:border-anthracite-600 dark:bg-anthracite-800"
            >
              <div className="lbl mb-1.5 text-[11px] text-gold-deep dark:text-gold-light">
                {t(`matchProfile.field.${f.key}`)}
              </div>
              {f.visible ? (
                <p className="text-[17px] leading-normal text-night dark:text-[#ECE7DD]">
                  {f.value === null
                    ? t("matchProfile.notProvided")
                    : f.key === "children"
                      ? t(`matchProfile.children_${f.value}`)
                      : f.key === "interests"
                        ? localizeList(f.value, INTEREST_LABELS, params.locale)
                        : f.key === "personality"
                          ? localizeList(
                              f.value,
                              PERSONALITY_LABELS,
                              params.locale,
                            )
                          : f.value}
                </p>
              ) : (
                <p className="flex items-center gap-1.5 text-[15px] text-sand-500 dark:text-[#8F8A80]">
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden
                  >
                    <rect
                      x="5"
                      y="11"
                      width="14"
                      height="9"
                      rx="2"
                      stroke="currentColor"
                      strokeWidth="1.7"
                    />
                    <path
                      d="M8 11V8a4 4 0 1 1 8 0v3"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                    />
                  </svg>
                  {t("matchProfile.lockedAt", {
                    stage: t(
                      `stages.${STEP_STAGE[f.unlocksAtStep] ?? "DISCERNMENT"}`,
                    ),
                  })}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      <BlessingRequest
        matchId={match.id}
        initialStatus={
          (myBlessing?.status as "PENDING" | "BLESSED" | "CAUTION") ?? null
        }
        note={
          myBlessing &&
          (myBlessing.status === "BLESSED" || myBlessing.status === "CAUTION")
            ? decryptOptional(myBlessing.noteEncrypted)
            : null
        }
      />
    </main>
  );
}
