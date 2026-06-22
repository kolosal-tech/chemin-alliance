import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/security/session";
import { Link } from "@/i18n/navigation";
import { CoachAdmin } from "./coach-admin";

export const dynamic = "force-dynamic";

export default async function AdminCoachesPage({
  params,
}: {
  params: { locale: string };
}) {
  setRequestLocale(params.locale);
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") notFound();

  const coaches = await prisma.coach.findMany({
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

  return (
    <main className="px-5 pt-6 safe-top lg:mx-auto lg:max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-2xl font-medium text-night dark:text-[#ECE7DD]">
          Accompagnateurs humains
        </h1>
        <Link
          href="/admin/reports"
          className="lbl text-[11px] text-gold-deep underline dark:text-gold-light"
        >
          Signalements →
        </Link>
      </div>
      <p className="mb-5 text-[16px] leading-snug text-warmgray dark:text-[#9A958B]">
        Ajoutez les pasteurs, prêtres et conseillers chrétiens vérifiés
        proposés aux membres pour l’accompagnement et le discernement.
      </p>
      <CoachAdmin coaches={coaches} />
    </main>
  );
}
