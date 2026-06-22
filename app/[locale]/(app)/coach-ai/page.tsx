import { setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { requirePageUser } from "@/lib/security/page-auth";
import { decryptOptional } from "@/lib/security/crypto";
import { CoachChat } from "./coach-chat";

export default async function CoachAiPage({
  params,
}: {
  params: { locale: string };
}) {
  setRequestLocale(params.locale);
  const user = await requirePageUser(params.locale);
  // Historique persistant (déchiffré) - restitué au rechargement de la page.
  const rows = await prisma.coachMessage.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    take: 200,
  });
  const initialEntries = rows.map((r) => ({
    id: r.id,
    role: r.role === "coach" ? ("coach" as const) : ("user" as const),
    text: decryptOptional(r.contentEncrypted) ?? "",
    guardrail: r.guardrail,
    mode: r.mode === "couple" ? ("couple" as const) : ("individual" as const),
    // Horodatage persistant : restitué au rechargement (comme la messagerie couple).
    createdAt: r.createdAt.toISOString(),
  }));
  return <CoachChat initialEntries={initialEntries} />;
}
