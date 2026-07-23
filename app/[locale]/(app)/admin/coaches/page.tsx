import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/security/session";
import { Link } from "@/i18n/navigation";
import { auditAdmin } from "@/lib/audit";
import { CoachAdmin } from "./coach-admin";

export const dynamic = "force-dynamic";

export default async function AdminCoachesPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const params = await props.params;
  setRequestLocale(params.locale);
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") {
    auditAdmin({
      event: "admin.coaches.read",
      action: "page",
      result: "denied",
      actorId: user?.id ?? "anonymous-admin-page",
      targetId: "page:admin-coaches",
    });
    notFound();
  }
  const t = await getTranslations("admin");

  const coaches = await (async () => {
    try {
      const data = await prisma.coach.findMany({
        orderBy: { displayName: "asc" },
        select: {
          id: true,
          displayName: true,
          affiliation: true,
          certified: true,
          specialties: true,
          pricePerSessionEUR: true,
          bio: true,
        },
      });
      auditAdmin({
        event: "admin.coaches.read",
        action: "page",
        result: "success",
        actorId: user.id,
        targetId: "page:admin-coaches",
      });
      return data;
    } catch (error) {
      auditAdmin({
        event: "admin.coaches.read",
        action: "page",
        result: "failure",
        actorId: user.id,
        targetId: "page:admin-coaches",
      });
      throw error;
    }
  })();

  return (
    <main className="px-3 pt-6 safe-top lg:mx-auto lg:max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-2xl font-medium text-night dark:text-[#ECE7DD]">
          {t("coachesTitle")}
        </h1>
        <Link
          href="/admin/reports"
          className="lbl text-[11px] text-gold-deep underline dark:text-gold-light"
        >
          {t("reportsLink")} →
        </Link>
      </div>
      <p className="mb-5 text-[16px] leading-snug text-warmgray dark:text-[#9A958B]">
        {t("coachesIntro")}
      </p>
      <CoachAdmin coaches={coaches} />
    </main>
  );
}
