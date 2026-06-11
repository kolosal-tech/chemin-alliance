import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { requirePageUser } from "@/lib/security/page-auth";
import { StageBadge } from "@/components/StageBadge";

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
      userA: { select: { id: true, displayName: true } },
      userB: { select: { id: true, displayName: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <main className="px-5 pt-6 safe-top lg:mx-auto lg:max-w-2xl">
      <h1 className="mb-4 font-display text-2xl font-medium text-night dark:text-[#ECE7DD]">
        {t("messaging.title")}
      </h1>
      <div className="flex flex-col gap-2.5">
        {matches.length === 0 && (
          <p className="rounded-card border border-sand-200 bg-surface p-5 text-sm text-warmgray dark:border-anthracite-600 dark:bg-anthracite-800 dark:text-[#9A958B]">
            {t("messaging.noConversations")}
          </p>
        )}
        {matches.map((m) => {
          const other = m.userAId === user.id ? m.userB : m.userA;
          return (
            <Link
              key={m.id}
              href={`/messages/${m.id}`}
              className="flex items-center gap-3 rounded-card border border-sand-200 bg-surface p-3.5 dark:border-anthracite-600 dark:bg-anthracite-800"
            >
              <span
                aria-hidden
                className="h-10 w-10 flex-none rounded-full blur-[3px]"
                style={{
                  background:
                    "radial-gradient(110% 90% at 40% 30%, #8A7A6A 0%, #5C4D44 60%, #352A28 100%)",
                }}
              />
              <div className="flex-1">
                <div className="font-display text-[16px] text-night dark:text-[#ECE7DD]">
                  {other.displayName}
                </div>
                <div className="mt-1">
                  <StageBadge stage={m.stage} />
                </div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M9 6l6 6-6 6" stroke="#C9A84C" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
