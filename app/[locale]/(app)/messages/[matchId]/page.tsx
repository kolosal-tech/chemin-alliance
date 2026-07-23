import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { requirePageUser } from "@/lib/security/page-auth";
import { decryptOptional } from "@/lib/security/crypto";
import { getStageQuestions, type Locale } from "@/lib/core-engine";
import { accessibleConversationWhere } from "@/lib/blocks";
import { pendingMatchDecisionWhere } from "@/lib/alliance";
import { Conversation } from "./conversation";

export default async function ConversationPage(props: {
  params: Promise<{ locale: string; matchId: string }>;
}) {
  const params = await props.params;
  setRequestLocale(params.locale);
  const user = await requirePageUser(params.locale);
  const activeMatch = await prisma.match.findFirst({
    where: accessibleConversationWhere(params.matchId, user.id),
    include: {
      userA: {
        select: {
          id: true,
          displayName: true,
          isVerified: true,
          photoBlurhash: true,
          kind: true,
        },
      },
      userB: {
        select: {
          id: true,
          displayName: true,
          isVerified: true,
          photoBlurhash: true,
          kind: true,
        },
      },
      messages: { orderBy: { createdAt: "asc" }, take: 200 },
    },
  });
  let pendingMatch = null;
  if (!activeMatch) {
    const pending = await prisma.match.findFirst({
      where: pendingMatchDecisionWhere(params.matchId, user.id),
      select: {
        id: true,
        userAId: true,
        userBId: true,
        requestedById: true,
        status: true,
        userA: {
          select: {
            id: true,
            displayName: true,
            isVerified: true,
            photoBlurhash: true,
            kind: true,
          },
        },
        userB: {
          select: {
            id: true,
            displayName: true,
            isVerified: true,
            photoBlurhash: true,
            kind: true,
          },
        },
      },
    });
    // PENDING : identité minimale pour décider, aucun message chargé.
    pendingMatch = pending ? { ...pending, stage: null, messages: [] } : null;
  }
  const match = activeMatch ?? pendingMatch;
  if (!match) {
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
  const suggestions = match.stage
    ? getStageQuestions(user.rulesetId, match.stage)
        .slice(0, 3)
        .map((q) => q.text[locale] ?? q.text.fr)
    : [];

  return (
    <Conversation
      matchId={match.id}
      stage={match.stage}
      other={other}
      isCompanion={other.kind === "AI_COMPANION"}
      currentUserId={user.id}
      pendingDecisionOnly={match.status === "PENDING"}
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
          createdAt: m.createdAt.toISOString(),
        }))}
    />
  );
}
