import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, readJsonLimited, withErrors } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";
import { rateLimit, LIMITS } from "@/lib/security/rate-limit";
import { sendCoupleInviteEmail } from "@/lib/email";
import type { Locale } from "@/lib/core-engine";
import { env } from "@/lib/env";
import {
  CoupleSpaceError,
  issueCoupleInvite,
  revokeCoupleInvite,
} from "@/lib/couple-space";

const schema = z.object({ email: z.string().email().toLowerCase() });

/** Envoie le code d'invitation de l'espace couple à l'email du conjoint/fiancé·e. */
export const POST = withErrors(async (req: Request) => {
  const user = await requireUser();
  const rl = await rateLimit(
    `couple-invite:${user.id}`,
    LIMITS.invite.limit,
    LIMITS.invite.windowMs,
  );
  if (!rl.allowed) return jsonError(429, "RATE_LIMITED");

  const { email } = schema.parse(await readJsonLimited(req));
  if (email === user.email.toLowerCase()) {
    return jsonError(400, "INVALID_TARGET");
  }

  try {
    // Chaque envoi fait tourner le secret précédent, le lie à l'adresse
    // destinataire et le borne à 72 h. Seul le HMAC reste en base.
    const invite = await issueCoupleInvite(user.id, email);
    const delivered = await sendCoupleInviteEmail(
      email,
      user.displayName,
      invite.code,
      (user.locale ?? "fr") as Locale,
    );
    if (!delivered && env.NODE_ENV === "production") {
      await revokeCoupleInvite(invite.spaceId, invite.codeHash);
      return jsonError(502, "EMAIL_FAILED");
    }
    return NextResponse.json(
      {
        ok: true,
        delivered,
        code: invite.code,
        expiresAt: invite.expiresAt,
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof CoupleSpaceError) {
      return jsonError(error.status, error.code);
    }
    throw error;
  }
});
