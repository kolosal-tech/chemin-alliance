import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { BookingPanel } from "./booking-panel";
import { CopilotPanel } from "./copilot-panel";
import { getSessionUser } from "@/lib/security/session";

export default async function CoachDetailPage({
  params,
}: {
  params: { locale: string; id: string };
}) {
  setRequestLocale(params.locale);
  const t = await getTranslations("coaches");
  const tc = await getTranslations("common");
  const coach = await prisma.coach.findUnique({ where: { id: params.id } });
  if (!coach) notFound();
  const user = await getSessionUser();
  const activeMatch = user
    ? await prisma.match.findFirst({
        where: {
          OR: [{ userAId: user.id }, { userBId: user.id }],
          status: "ACTIVE",
        },
        include: {
          userA: { select: { id: true, displayName: true } },
          userB: { select: { id: true, displayName: true } },
        },
        orderBy: { updatedAt: "desc" },
      })
    : null;

  const stars = Math.round(coach.ratingAvg);

  return (
    <main className="safe-top lg:mx-auto lg:max-w-2xl">
      <div className="relative bg-night px-6 pb-6 pt-12 text-[#F2EFE8]">
        <Link href="/coaches" aria-label={tc("back")} className="absolute left-5 top-12">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M15 5l-7 7 7 7" stroke="#A6AEC0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <div className="mt-4 flex items-center gap-4">
          <span
            aria-hidden
            className="h-[72px] w-[72px] flex-none rounded-cardlg"
            style={{
              background:
                "radial-gradient(110% 90% at 35% 30%, #6E7790 0%, #41506E 55%, #222F4C 100%)",
            }}
          />
          <div>
            <div className="font-display text-2xl">{coach.displayName}</div>
            {coach.certified && (
              <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-[8px] border border-gold/40 bg-gold/15 px-2.5 py-1 text-[13px] font-semibold text-[#E8D9A8]">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M12 2.5l2.4 1.7 2.9-.2 1 2.8 2.4 1.6-.8 2.8.8 2.8-2.4 1.6-1 2.8-2.9-.2L12 21.5l-2.4-1.7-2.9.2-1-2.8L3.3 15.6l.8-2.8-.8-2.8 2.4-1.6 1-2.8 2.9.2L12 2.5Z" fill="#C9A84C" />
                  <path d="M8.8 12l2.1 2.1 4.3-4.4" stroke="#131D33" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {t("certified")}
              </span>
            )}
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 text-[16px] text-[#B9C0CE]">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M12 21c-5-4-8-7-8-11a8 8 0 1 1 16 0c0 4-3 7-8 11Z" stroke="#8A92A6" strokeWidth="1.5" strokeLinejoin="round" />
            <circle cx="12" cy="10" r="2.5" stroke="#8A92A6" strokeWidth="1.5" />
          </svg>
          {coach.affiliation}
        </div>
      </div>

      <div className="px-5 pt-5">
        <div className="mb-5 flex items-center gap-2.5">
          <div className="flex gap-0.5" aria-hidden>
            {[1, 2, 3, 4, 5].map((i) => (
              <svg key={i} width="16" height="16" viewBox="0 0 24 24">
                <path d="M12 3l2.5 6.3 6.8.4-5.2 4.3 1.7 6.6L12 17.7 6.2 20.6l1.7-6.6L2.7 9.7l6.8-.4L12 3Z" fill={i <= stars ? "#C9A84C" : "#D8CFB6"} />
              </svg>
            ))}
          </div>
          <span className="text-[16px] text-[#3A372F] dark:text-[#CFCAC0]">
            <b>{coach.ratingAvg.toFixed(1).replace(".", ",")}</b> ·{" "}
            {t("reviews", { count: coach.reviewsCount })}
          </span>
        </div>

        <h2 className="lbl mb-2.5 text-[12px] text-gold-deep dark:text-gold-light">
          {t("specialties")}
        </h2>
        <div className="mb-5 flex flex-wrap gap-2">
          {coach.specialties.map((s) => (
            <span key={s} className="rounded-[9px] border border-[#DCE1E9] bg-[#EAEDF2] px-2.5 py-1.5 text-xs font-medium text-[#2A3550] dark:border-[#2A3A56] dark:bg-[#1A2233] dark:text-[#B9C6E0]">
              {s}
            </span>
          ))}
        </div>
        {coach.bio && (
          <p className="mb-5 text-sm leading-relaxed text-warmgray dark:text-[#9A958B]">
            {coach.bio}
          </p>
        )}
        <BookingPanel coachId={coach.id} priceEUR={coach.pricePerSessionEUR} />
        {activeMatch && user && (
          <CopilotPanel
            matchId={activeMatch.id}
            otherName={
              activeMatch.userAId === user.id
                ? activeMatch.userB.displayName
                : activeMatch.userA.displayName
            }
          />
        )}
      </div>
    </main>
  );
}
