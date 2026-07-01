import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { requirePageUser } from "@/lib/security/page-auth";
import { decryptOptional } from "@/lib/security/crypto";
import { CoachChat } from "./coach-chat";

export default async function CoachAiPage(
  props: {
    params: Promise<{ locale: string }>;
  }
) {
  const params = await props.params;
  setRequestLocale(params.locale);
  const user = await requirePageUser(params.locale);
  // Email non verifie : l'IA payante reste fermee (cf. audit ticket 1). La
  // banniere globale (layout) propose deja le renvoi du lien de verification.
  if (!user.isVerified) {
    const t = await getTranslations("aiCoach");
    return (
      <main className="safe-top px-3 pt-6 lg:mx-auto lg:max-w-xl">
        <div className="rounded-card border border-info-border bg-info-surface p-5 text-info-ink dark:border-info-darkBorder dark:bg-info-darkSurface dark:text-info-darkInk">
          <h1 className="font-display text-xl">{t("verifyTitle")}</h1>
          <p className="mt-2 text-sm leading-relaxed">{t("verifyBody")}</p>
        </div>
      </main>
    );
  }
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
