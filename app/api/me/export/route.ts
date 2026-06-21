import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrors } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";
import { decryptOptional } from "@/lib/security/crypto";

/** RGPD - droit à la portabilité : export JSON complet et lisible. */
export const GET = withErrors(async () => {
  const user = await requireUser();
  const [consents, matches, messages, answers, bookings, reports] =
    await Promise.all([
      prisma.consent.findMany({ where: { userId: user.id } }),
      prisma.match.findMany({
        where: { OR: [{ userAId: user.id }, { userBId: user.id }] },
        select: { id: true, stage: true, status: true, createdAt: true },
      }),
      prisma.message.findMany({
        where: { senderId: user.id },
        select: { matchId: true, contentEncrypted: true, createdAt: true, moderationStatus: true },
      }),
      prisma.allianceAnswer.findMany({ where: { userId: user.id } }),
      prisma.booking.findMany({ where: { userId: user.id } }),
      prisma.report.findMany({ where: { reporterId: user.id } }),
    ]);

  const data = {
    exportedAt: new Date().toISOString(),
    account: {
      email: user.email,
      displayName: user.displayName,
      age: user.age,
      locale: user.locale,
      createdAt: user.createdAt,
    },
    faithProfile: user.faithProfile && {
      vertical: user.faithProfile.vertical,
      denomination: user.faithProfile.denomination,
      ministry: user.faithProfile.ministry,
      localChurch: decryptOptional(user.faithProfile.localChurchEncrypted),
      testimony: decryptOptional(user.faithProfile.testimonyEncrypted),
    },
    relationshipProfile: user.relationshipProfile && {
      maritalStatus: user.relationshipProfile.maritalStatus,
      hasChildren: user.relationshipProfile.hasChildren,
      wantsChildren: user.relationshipProfile.wantsChildren,
      acceptsChildren: user.relationshipProfile.acceptsChildren,
      intentionStatement: user.relationshipProfile.intentionStatement,
      familyVision: decryptOptional(
        user.relationshipProfile.familyVisionEncrypted,
      ),
    },
    privacySettings: user.privacySettings,
    consents,
    matches,
    messagesSent: messages.map((m) => ({
      matchId: m.matchId,
      content: decryptOptional(m.contentEncrypted),
      createdAt: m.createdAt,
      moderationStatus: m.moderationStatus,
    })),
    allianceAnswers: answers,
    bookings,
    reportsMade: reports,
  };

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "content-type": "application/json",
      "content-disposition": 'attachment; filename="chemin-alliance-export.json"',
    },
  });
});
