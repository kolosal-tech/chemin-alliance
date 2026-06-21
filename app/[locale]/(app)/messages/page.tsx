import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { requirePageUser } from "@/lib/security/page-auth";
import { StageBadge } from "@/components/StageBadge";
import { MemberAvatar } from "@/components/MemberAvatar";
import { silenceDetected } from "@/lib/agents/exit-helper";
import { unreadByMatch } from "@/lib/unread";

export default async function MessagesListPage({
  params,
}: {
  params: { locale: string };
}) {
  setRequestLocale(params.locale);
  const t = await getTranslations();
  const user = await requirePageUser(params.locale);
  const matches = await prisma.match.findMany({
    where: {
      OR: [{ userAId: user.id }, { userBId: user.id }],
      status: { not: "CLOSED" },
    },
    include: {
      userA: { select: { id: true, displayName: true, photoBlurhash: true } },
      userB: { select: { id: true, displayName: true, photoBlurhash: true } },
      messages: {
        where: { kind: "USER" },
        orderBy: { createdAt: "desc" },
        take: 6,
        select: { senderId: true, createdAt: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
  const unread = await unreadByMatch(user.id);
  const closedCount = await prisma.match.count({
    where: {
      OR: [{ userAId: user.id }, { userBId: user.id }],
      status: "CLOSED",
    },
  });

  return (
    <main className="px-5 pt-6 safe-top lg:mx-auto lg:max-w-2xl">
      <h1 className="mb-4 font-display text-2xl font-medium text-night dark:text-[#ECE7DD]">
        {t("messaging.title")}
      </h1>
      <div className="flex flex-col gap-2.5">
        {matches.length === 0 &&
          (user.season !== "JOURNEY" ? (
            // Espace couple (fiancés/mariés/parents) : la messagerie à deux vit
            // dans l'onglet Couple, pas ici (qui ne liste que les rencontres).
            // On évite la fausse impression de bug en orientant vers le bon endroit.
            <div className="rounded-card border border-sand-200 bg-surface p-5 dark:border-anthracite-600 dark:bg-anthracite-800">
              <p className="text-sm text-warmgray dark:text-[#9A958B]">
                {t("messaging.coupleSpaceBody")}
              </p>
              <Link
                href="/couple"
                className="mt-3 inline-block rounded-btnsm bg-navy px-4 py-2.5 text-sm font-semibold text-[#F4F1EA] dark:bg-gold-light dark:text-anthracite-900"
              >
                {t("messaging.coupleSpaceCta")}
              </Link>
            </div>
          ) : (
            <p className="rounded-card border border-sand-200 bg-surface p-5 text-sm text-warmgray dark:border-anthracite-600 dark:bg-anthracite-800 dark:text-[#9A958B]">
              {t("messaging.noConversations")}
            </p>
          ))}
        {matches.map((m) => {
          const other = m.userAId === user.id ? m.userB : m.userA;
          const lastOther =
            m.messages.find((x) => x.senderId !== user.id)?.createdAt ?? null;
          const lastMine =
            m.messages.find((x) => x.senderId === user.id)?.createdAt ?? null;
          const silence = silenceDetected(lastOther, lastMine);
          return (
            <Link
              key={m.id}
              href={`/messages/${m.id}`}
              className="flex items-center gap-3 rounded-card border border-sand-200 bg-surface p-3.5 dark:border-anthracite-600 dark:bg-anthracite-800"
            >
              <MemberAvatar
                userId={other.id}
                photoBlurhash={other.photoBlurhash}
                className="h-10 w-10 flex-none rounded-full"
              />
              <div className="flex-1">
                <div className="font-display text-[16px] text-night dark:text-[#ECE7DD]">
                  {other.displayName}
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <StageBadge stage={m.stage} />
                  {m.status === "PENDING" &&
                    m.requestedById &&
                    m.requestedById !== user.id && (
                      <span className="rounded-[6px] bg-navy px-2 py-0.5 text-[10px] font-semibold text-[#F4F1EA] dark:bg-gold-light dark:text-anthracite-900">
                        {t("messaging.newRequest")}
                      </span>
                    )}
                  {silence && (
                    <span className="rounded-[6px] bg-[#FBF6E9] px-2 py-0.5 text-[10px] font-semibold text-gold-ink dark:bg-[#2C2818] dark:text-gold-light">
                      {t("alliance.exitElegant")} ?
                    </span>
                  )}
                </div>
              </div>
              {unread[m.id] ? (
                <span className="min-w-[20px] flex-none rounded-full bg-[#C0392B] px-1.5 py-0.5 text-center text-[11px] font-bold text-white">
                  {unread[m.id]}
                </span>
              ) : null}
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden
              >
                <path
                  d="M9 6l6 6-6 6"
                  stroke="#C9A84C"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </Link>
          );
        })}
      </div>
      {closedCount > 0 && (
        <Link
          href="/rebuilding"
          className="mt-4 block rounded-cardlg border border-sand-200 bg-surface p-4 dark:border-anthracite-600 dark:bg-anthracite-800"
        >
          <div className="font-display text-[17px] text-night dark:text-[#ECE7DD]">
            {t("agents.rebuild.cardTitle")}
          </div>
          <p className="mt-1 text-[12.5px] leading-snug text-warmgray dark:text-[#9A958B]">
            {t("agents.rebuild.cardBody")}
          </p>
          <span className="lbl mt-2 inline-block text-[9px] text-gold-deep dark:text-gold-light">
            {t("agents.rebuild.cta")} →
          </span>
        </Link>
      )}
    </main>
  );
}
