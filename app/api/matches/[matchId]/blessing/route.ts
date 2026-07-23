import { NextResponse } from "next/server";
import { jsonError, withErrors } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";
import { rateLimit, LIMITS } from "@/lib/security/rate-limit";
import type { Locale } from "@/lib/core-engine";
import { requireActiveMatchMember } from "@/lib/alliance";
import {
  BlessingDeliveryError,
  BlessingDeliveryInProgressError,
  BlessingSponsorMissingError,
  BlessingStateChangedError,
  issueBlessingRequest,
} from "@/lib/blessing";

export const runtime = "nodejs";

// L'utilisateur (filleul·e) demande la bénédiction de son Parrain/Marraine
// avant d'avancer dans une mise en relation. Garde : membre du match + parrain
// désigné. Email avec lien magique. Non bloquant (advisory).
export const POST = withErrors(
  async (
    req: Request,
    { params }: { params: Promise<{ matchId: string }> },
  ) => {
    const user = await requireUser();
    const rl = await rateLimit(
      `blessing:${user.id}`,
      LIMITS.invite.limit,
      LIMITS.invite.windowMs,
    );
    if (!rl.allowed) return jsonError(429, "RATE_LIMITED");

    const { matchId } = await params;
    // Garde rapide puis revalidation dans la transaction SERIALIZABLE
    // d'émission : le match peut changer ou être bloqué entre deux await.
    await requireActiveMatchMember(matchId, user.id);

    try {
      await issueBlessingRequest({
        userId: user.id,
        displayName: user.displayName,
        locale: (user.locale ?? "fr") as Locale,
        matchId,
      });
    } catch (error) {
      if (error instanceof BlessingSponsorMissingError) {
        return jsonError(409, "NO_SPONSOR");
      }
      if (error instanceof BlessingDeliveryError) {
        return jsonError(502, "BLESSING_EMAIL_DELIVERY_FAILED");
      }
      if (error instanceof BlessingDeliveryInProgressError) {
        return jsonError(503, "BLESSING_EMAIL_DELIVERY_IN_PROGRESS");
      }
      if (error instanceof BlessingStateChangedError) {
        return jsonError(409, "MATCH_STATE_CHANGED");
      }
      throw error;
    }

    return NextResponse.json({ ok: true });
  },
);
