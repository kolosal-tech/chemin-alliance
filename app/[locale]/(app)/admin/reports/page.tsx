import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { openInsight } from "@/lib/agent-insight";
import { getSessionUser } from "@/lib/security/session";
import { Link } from "@/i18n/navigation";
import { ReportActions } from "./report-actions";

export default async function AdminReportsPage({
  params,
}: {
  params: { locale: string };
}) {
  setRequestLocale(params.locale);
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") notFound();
  const t = await getTranslations("admin");

  const ta = await getTranslations("agents.watch");
  const signals = await prisma.agentInsight.findMany({
    where: { agentId: "watchman", revokedAt: null },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: { user: { select: { displayName: true } } },
  });
  // Sévérité d'abord : les signaux "high" (arnaque/argent) remontent en tête.
  const sevRank: Record<string, number> = { high: 0, medium: 1, none: 2 };
  signals.sort(
    (a, b) =>
      (sevRank[openInsight<{ severity?: string }>(a.dataJson)?.severity ?? "none"] ?? 2) -
      (sevRank[openInsight<{ severity?: string }>(b.dataJson)?.severity ?? "none"] ?? 2),
  );
  const reports = await prisma.report.findMany({
    where: { status: { in: ["OPEN", "REVIEWING"] } },
    orderBy: { createdAt: "desc" },
    include: {
      reporter: { select: { displayName: true } },
      target: { select: { displayName: true } },
    },
  });

  return (
    <main className="px-4 pt-6 safe-top lg:mx-auto lg:max-w-2xl">
      <h1 className="mb-1 font-display text-2xl font-medium text-night dark:text-[#ECE7DD]">
        {t("title")}
      </h1>
      <p className="lbl mb-2 text-[12px] text-gold-deep dark:text-gold-light">
        {t("reportsOpen")} · {reports.length}
      </p>
      <Link
        href="/admin/coaches"
        className="mb-4 inline-block rounded-btnsm border border-sand-300 px-3 py-1.5 text-[15px] font-semibold text-ink dark:border-anthracite-600 dark:text-[#ECE7DD]"
      >
        Gérer les accompagnateurs (pasteurs / prêtres) →
      </Link>
      <div className="flex flex-col gap-3">
        {reports.length === 0 && (
          <p className="rounded-card border border-sand-200 bg-surface p-5 text-sm text-warmgray dark:border-anthracite-600 dark:bg-anthracite-800 dark:text-[#9A958B]">
            {t("empty")}
          </p>
        )}
        {reports.map((r) => (
          <article
            key={r.id}
            className="rounded-card border border-sand-200 bg-surface p-4 dark:border-anthracite-600 dark:bg-anthracite-800"
          >
            <div className="mb-2 flex items-center justify-between text-xs text-sand-600 dark:text-[#7E7A72]">
              <span>
                {t("reporter")} <b>{r.reporter.displayName}</b> → {t("target")}{" "}
                <b>{r.target.displayName}</b>
              </span>
              <span className="lbl text-[11px]">{r.status}</span>
            </div>
            <p className="mb-3 text-sm leading-snug text-ink dark:text-[#CFCAC0]">
              {r.reason}
            </p>
            <ReportActions reportId={r.id} />
          </article>
        ))}
      </div>

      <h2 className="lbl mb-3 mt-7 text-[12px] text-gold-deep dark:text-gold-light">
        {ta("title")} · {signals.length}
      </h2>
      <div className="flex flex-col gap-2.5 pb-8">
        {signals.length === 0 && (
          <p className="rounded-card border border-sand-200 bg-surface p-4 text-sm text-warmgray dark:border-anthracite-600 dark:bg-anthracite-800 dark:text-[#9A958B]">
            {ta("empty")}
          </p>
        )}
        {signals.map((sig) => {
          const data =
            openInsight<{
              signals?: string[];
              severity?: "none" | "medium" | "high";
              excerpt?: string;
            }>(sig.dataJson) ?? {};
          const high = data.severity === "high";
          return (
            <article
              key={sig.id}
              className={`rounded-card border p-3.5 ${high ? "border-[#D8B6B0] bg-[#FBF0EE] dark:border-[#5A3A34] dark:bg-[#2A1B18]" : "border-[#EAD9A8] bg-[#FBF6E9] dark:border-[#463A1F] dark:bg-[#272117]"}`}
            >
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                {data.severity && data.severity !== "none" && (
                  <span
                    className={`rounded-[6px] px-2 py-0.5 text-[13px] font-bold ${high ? "bg-danger/15 text-danger" : "bg-gold/25 text-gold-ink dark:text-[#E0C77A]"}`}
                  >
                    {ta(`severity_${data.severity}`)}
                  </span>
                )}
                {(data.signals ?? []).map((sg) => (
                  <span
                    key={sg}
                    className="rounded-[6px] bg-gold/20 px-2 py-0.5 text-[13px] font-semibold text-gold-ink dark:text-[#E0C77A]"
                  >
                    {ta(`signal_${sg}`)}
                  </span>
                ))}
                <span className="ml-auto text-[13px] text-sand-600 dark:text-[#7E7A72]">
                  {sig.user?.displayName ?? "?"}
                </span>
              </div>
              <p className="text-[15px] italic leading-snug text-[#6F5C2E] dark:text-[#C2B488]">
                « {data.excerpt} »
              </p>
            </article>
          );
        })}
      </div>
    </main>
  );
}
