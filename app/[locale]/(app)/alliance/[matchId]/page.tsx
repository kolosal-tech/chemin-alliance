import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { requirePageUser } from "@/lib/security/page-auth";
import { compatibilityTopics } from "@/lib/matching";
import { getStageQuestions, type Locale } from "@/lib/core-engine";
import { AllianceThread } from "@/components/AllianceThread";
import { Radar } from "@/components/Radar";
import { StageActions } from "./stage-actions";

const STAGE_NUM: Record<string, number> = {
  DISCOVERY: 1, DIALOGUE: 2, DISCERNMENT: 3,
  ACCOMPANIMENT: 4, COMMITMENT: 5, MARRIAGE_PREPARATION: 6, CLOSED: 6,
};

export default async function AlliancePage({
  params,
}: {
  params: { locale: string; matchId: string };
}) {
  setRequestLocale(params.locale);
  const t = await getTranslations();
  const user = await requirePageUser(params.locale);
  const match = await prisma.match.findUnique({
    where: { id: params.matchId },
    include: {
      userA: { include: { faithProfile: true, relationshipProfile: true } },
      userB: { include: { faithProfile: true, relationshipProfile: true } },
      allianceAnswers: true,
    },
  });
  if (!match || (match.userAId !== user.id && match.userBId !== user.id)) {
    notFound();
  }
  const me = match.userAId === user.id ? match.userA : match.userB;
  const other = match.userAId === user.id ? match.userB : match.userA;
  const locale = params.locale as Locale;
  const num = STAGE_NUM[match.stage];
  const sinceDays = Math.max(
    0,
    Math.floor((Date.now() - match.updatedAt.getTime()) / 86_400_000),
  );
  const questions =
    match.stage === "CLOSED"
      ? []
      : getStageQuestions(user.rulesetId, match.stage).map((q) => ({
          id: q.id,
          text: q.text[locale] ?? q.text.fr,
          answered: match.allianceAnswers.some(
            (a) => a.questionId === q.id && a.userId === user.id,
          ),
        }));
  const { axes, topics } = compatibilityTopics(me, other);

  return (
    <main className="px-5 pt-5 safe-top lg:mx-auto lg:max-w-2xl">
      <header className="mb-3 flex items-center gap-3">
        <Link href={`/messages/${match.id}`} aria-label={t("common.back")} className="p-1">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-warmgray dark:text-[#9A958B]" />
          </svg>
        </Link>
        <div>
          <div className="lbl text-[9px] text-gold-deep dark:text-gold-light">
            {t("alliance.yourPath")}
          </div>
          <div className="font-display text-lg text-night dark:text-[#ECE7DD]">
            {t("alliance.with", { name: other.displayName })}
          </div>
        </div>
      </header>

      <AllianceThread current={num} className="mb-4" />

      <section className="mb-4 rounded-card bg-night p-4.5 p-5 text-[#F2EFE8] dark:border dark:border-[#283655] dark:bg-[#1B2740]">
        <div className="flex items-center justify-between">
          <span className="lbl text-[9px] text-gold dark:text-gold-light">
            {t("stages.stageInProgress", { n: num })}
          </span>
          <span className="text-[11px] text-[#8A92A6]">
            {t("stages.sinceDays", { days: sinceDays })}
          </span>
        </div>
        <div className="my-1.5 font-display text-[26px]">{t(`stages.${match.stage}`)}</div>
        <p className="text-[13px] leading-normal text-[#B9C0CE]">
          {match.stage !== "CLOSED" ? t(`stages.desc${match.stage}`) : ""}
        </p>
      </section>

      {questions.length > 0 && (
        <>
          <h2 className="lbl mb-2.5 text-[9.5px] text-gold-deep dark:text-gold-light">
            {t("alliance.questionsTitle")}
          </h2>
          <StageActions
            matchId={match.id}
            questions={questions}
            contactExchange={match.contactExchange}
            stage={match.stage}
            otherName={other.displayName}
          />
        </>
      )}

      <div className="mb-1.5 mt-5 flex items-baseline justify-between">
        <h2 className="lbl text-[9.5px] text-gold-deep dark:text-gold-light">
          {t("alliance.topicsTitle")}
        </h2>
        <span className="text-[10.5px] text-sand-500 dark:text-[#65625B]">
          {t("alliance.neverScore")}
        </span>
      </div>
      <div className="flex items-center gap-2 rounded-[14px] border border-sand-200 bg-surface p-2.5 dark:border-anthracite-600 dark:bg-anthracite-800">
        <Radar axes={axes} />
        <ul className="flex flex-1 flex-col gap-1.5 text-[11.5px]">
          {topics.map((topic) => (
            <li key={topic.key} className="flex items-center gap-1.5">
              <span
                aria-hidden
                className={`h-[7px] w-[7px] rounded-[2px] ${
                  topic.status === "aligned"
                    ? "bg-sage dark:bg-[#7FA98C]"
                    : topic.status === "ok"
                      ? "bg-sage/70 dark:bg-[#7FA98C]/70"
                      : "bg-amberink dark:bg-[#C99A4E]"
                }`}
              />
              <span className="text-[#3A372F] dark:text-[#CFCAC0]">
                {t(`alliance.radar.${topic.key}`)} ·{" "}
                {topic.status === "aligned"
                  ? t("alliance.legendAligned")
                  : topic.status === "ok"
                    ? t("alliance.legendOk")
                    : t("alliance.legendDeepen")}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
