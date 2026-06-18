import { setRequestLocale } from "next-intl/server";
import { requirePageUser } from "@/lib/security/page-auth";
import { prisma } from "@/lib/db";
import { SponsorPanel } from "./sponsor-panel";

export default async function SponsorPage({
  params,
}: {
  params: { locale: string };
}) {
  setRequestLocale(params.locale);
  const user = await requirePageUser(params.locale);
  const s = await prisma.sponsor.findUnique({ where: { userId: user.id } });
  return (
    <SponsorPanel
      initial={
        s ? { name: s.name, email: s.email, relation: s.relation } : null
      }
    />
  );
}
