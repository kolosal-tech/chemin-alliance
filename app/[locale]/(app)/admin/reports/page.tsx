import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/security/session";
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

  const reports = await prisma.report.findMany({
    where: { status: { in: ["OPEN", "REVIEWING"] } },
    orderBy: { createdAt: "desc" },
    include: {
      reporter: { select: { displayName: true } },
      target: { select: { displayName: true } },
    },
  });

  return (
    <main className="px-5 pt-6 safe-top">
      <h1 className="mb-1 font-display text-2xl font-medium text-night dark:text-[#ECE7DD]">
        {t("title")}
      </h1>
      <p className="lbl mb-4 text-[9.5px] text-gold-deep dark:text-gold-light">
        {t("reportsOpen")} · {reports.length}
      </p>
      <div className="flex flex-col gap-3">
        {reports.length === 0 && (
          <p className="rounded-card border border-sand-200 bg-surface p-5 text-sm text-warmgray dark:border-anthracite-600 dark:bg-anthracite-800 dark:text-[#9A958B]">
            {t("empty")}
          </p>
        )}
        {reports.map((r) => (
          <article key={r.id} className="rounded-card border border-sand-200 bg-surface p-4 dark:border-anthracite-600 dark:bg-anthracite-800">
            <div className="mb-2 flex items-center justify-between text-xs text-sand-600 dark:text-[#7E7A72]">
              <span>
                {t("reporter")} <b>{r.reporter.displayName}</b> → {t("target")}{" "}
                <b>{r.target.displayName}</b>
              </span>
              <span className="lbl text-[8.5px]">{r.status}</span>
            </div>
            <p className="mb-3 text-sm leading-snug text-ink dark:text-[#CFCAC0]">{r.reason}</p>
            <ReportActions reportId={r.id} />
          </article>
        ))}
      </div>
    </main>
  );
}
