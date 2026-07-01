import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, withErrors } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";
import { requireMatchMember } from "@/lib/alliance";
import { sendPushToUser } from "@/lib/push";
import { requestAcceptedNotification } from "@/lib/push-messages";
import { sendMatchAcceptedEmail } from "@/lib/email";

// web-push (via lib/push) requiert le runtime Node.
export const runtime = "nodejs";

export const POST = withErrors(
  async (
    _req: Request,
    { params }: { params: Promise<{ matchId: string }> },
  ) => {
    const user = await requireUser();
    const match = await requireMatchMember((await params).matchId, user.id);
    if (match.status === "PENDING") {
      // Consentement mutuel : le demandeur connu ne peut pas s'auto-accepter.
      // Un ancien match sans demandeur (legacy, requestedById null) reste
      // acceptable par l'un ou l'autre membre - sinon il resterait figé.
      if (match.requestedById && match.requestedById === user.id) {
        return jsonError(403, "CANNOT_ACCEPT");
      }
      await prisma.match.update({
        where: { id: match.id },
        data: { status: "ACTIVE" },
      });
      // Notifie le demandeur que sa demande est acceptée (best-effort).
      if (match.requestedById && match.requestedById !== user.id) {
        try {
          const requester = await prisma.user.findUnique({
            where: { id: match.requestedById },
            select: { locale: true, email: true },
          });
          await sendPushToUser(
            match.requestedById,
            requestAcceptedNotification(requester?.locale, match.id),
          );
          if (requester?.email) {
            await sendMatchAcceptedEmail(
              requester.email,
              user.displayName ?? "",
              match.id,
              (requester.locale ?? "fr") as Parameters<
                typeof sendMatchAcceptedEmail
              >[3],
            );
          }
        } catch (err) {
          console.error("[notify] notif acceptation échouée", err);
        }
      }
    }
    return NextResponse.json({ ok: true });
  },
);
