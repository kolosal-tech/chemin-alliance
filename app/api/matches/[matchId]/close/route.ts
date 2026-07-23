import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, withErrors, readJsonLimited } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";
import { requireClosableMatchMember } from "@/lib/alliance";
import { encryptField } from "@/lib/security/crypto";
import { withSerializableRetry } from "@/lib/blessing";

const schema = z.object({ message: z.string().min(1).max(1000) });

/** Sortie relationnelle élégante : clôture digne + dernier message respectueux. */
export const POST = withErrors(
  async (
    req: Request,
    { params }: { params: Promise<{ matchId: string }> },
  ) => {
    const user = await requireUser();
    const match = await requireClosableMatchMember(
      (await params).matchId,
      user.id,
    );

    // Refus minimal d'une demande : aucun contenu du fil n'est lu ni créé.
    if (match.status === "PENDING") {
      if (match.requestedById === user.id) {
        return jsonError(403, "CANNOT_DECLINE_OWN_REQUEST");
      }
      const declined = await withSerializableRetry(async (tx) => {
        const result = await tx.match.updateMany({
          where: { id: match.id, status: "PENDING" },
          data: {
            stage: "CLOSED",
            status: "CLOSED",
            closedBy: user.id,
            closeMessage: null,
            contactExchange: "REVOKED",
            contactExchangeRequestedBy: null,
            advanceRequestedBy: null,
          },
        });
        if (result.count === 1) {
          await tx.blessing.deleteMany({
            where: { matchId: match.id, status: "PENDING" },
          });
        }
        return result;
      });
      if (declined.count !== 1) {
        return jsonError(409, "MATCH_STATE_CHANGED");
      }
      return NextResponse.json({ ok: true, closed: true });
    }

    const { message } = schema.parse(await readJsonLimited(req));
    const contentEncrypted = encryptField(message);
    const closed = await withSerializableRetry(async (tx) => {
      const result = await tx.match.updateMany({
        where: { id: match.id, status: "ACTIVE" },
        data: {
          stage: "CLOSED",
          status: "CLOSED",
          closedBy: user.id,
          closeMessage: null,
        },
      });
      if (result.count !== 1) return false;

      await tx.blessing.deleteMany({
        where: { matchId: match.id, status: "PENDING" },
      });
      await tx.message.create({
        data: {
          matchId: match.id,
          senderId: user.id,
          contentEncrypted,
        },
      });
      return true;
    });
    if (!closed) return jsonError(409, "MATCH_STATE_CHANGED");

    return NextResponse.json({ ok: true, closed: true });
  },
);
