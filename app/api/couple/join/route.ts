import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, readJsonLimited, withErrors } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";
import { rateLimit, LIMITS } from "@/lib/security/rate-limit";
import { CoupleSpaceError, joinCoupleSpaceByInvite } from "@/lib/couple-space";

const schema = z.object({ code: z.string().min(12).max(32) });

/** Le conjoint rejoint l'espace par code d'invitation. */
export const POST = withErrors(async (req: Request) => {
  const user = await requireUser();
  // Anti-brute-force du code ALLIANCE-XXXXXXXXXXXX : plafond ferme PAR UTILISATEUR.
  // On ne mêle PAS l'IP à la clé - sinon chaque IP relance un budget neuf et
  // un attaquant qui tourne ses IP contourne le plafond (cf. couple/invite).
  const rl = await rateLimit(
    `couple-join:${user.id}`,
    LIMITS.coupleJoin.limit,
    LIMITS.coupleJoin.windowMs,
  );
  if (!rl.allowed) return jsonError(429, "RATE_LIMITED");
  const { code } = schema.parse(await readJsonLimited(req));
  try {
    const result = await joinCoupleSpaceByInvite(user.id, code);
    return NextResponse.json(
      { ok: true, ...result },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof CoupleSpaceError) {
      return jsonError(error.status, error.code);
    }
    throw error;
  }
});
