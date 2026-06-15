import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { requirePageUser } from "@/lib/security/page-auth";
import { decryptOptional } from "@/lib/security/crypto";
import { getStageQuestions, type Locale } from "@/lib/core-engine";
import { Conversation } from "./conversation";

export default async function ConversationPage({
  params,
}: {
  params: { locale: string; matchId: string };
}) {
  setRequestLocale(params.locale);
  const user = await requirePageUser(params.locale);
  const match = await prisma.match.findUnique({
    where: { id: params.matchId },
    include: {
      userA: { select: { id: true, displayName: true, isVerified: true } },
      userB: { select: { id: true, displayName: true, isVerified: true } },
      messages: { orderBy: { createdAt: "asc" }, take: 200 },
    },
  });
  if (!match || (match.userAId !== user.id && match.userBId !== user.id)) {
    notFound();
  }
  const other = match.userAId === user.id ? match.userB : match.userA;
  const locale = params.locale as Locale;
  const awaitingMyAccept =
    match.status === "PENDING" &&
    match.requestedById != null &&
    match.requestedById !== user.id;
  const awaitingOther =
    match.status === "PENDING" && match.requestedById === user.id;
  const suggestions =
    match.stage === "CLOSED"
      ? []
      : getStageQuestions(user.rulesetId, match.stage)
          .slice(0, 3)
          .map((q) => q.text[locale] ?? q.text.fr);

  return (
    <Conversation
      matchId={match.id}
      stage={match.stage}
      other={other}
      awaitingMyAccept={awaitingMyAccept}
      awaitingOther={awaitingOther}
      suggestions={suggestions}
      initialMessages={match.messages
        .filter(
          (m) => m.moderationStatus !== "BLOCKED" || m.senderId === user.id,
        )
        .map((m) => ({
          id: m.id,
          kind: m.kind,
          mine: m.senderId === user.id,
          content: decryptOptional(m.contentEncrypted) ?? "",
          blocked: m.moderationStatus === "BLOCKED",
        }))}
    />
  );
}
