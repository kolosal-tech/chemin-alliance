import { z } from "zod";
import { jsonError, readJsonLimited, withErrors } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";
import { requireActiveMatchMember } from "@/lib/alliance";
import { rateLimit } from "@/lib/security/rate-limit";
import { SCOPED_COACH_CONSENT_SUPPORTED } from "@/lib/agents/coach-copilot";

const schema = z.object({
  matchId: z.string().min(1),
  consent: z.literal(true),
});

/**
 * Le consentement générique historique ne prouve ni relation, ni destinataire,
 * ni finalité, ni version. La fonction échoue donc fermée jusqu'à ce que ces
 * quatre dimensions soient persistées et vérifiables.
 */
export const POST = withErrors(async (req: Request) => {
  const user = await requireUser();
  const rl = await rateLimit(`copilot:${user.id}`, 6, 60 * 60_000);
  if (!rl.allowed) return jsonError(429, "RATE_LIMITED");
  const { matchId } = schema.parse(await readJsonLimited(req));
  await requireActiveMatchMember(matchId, user.id);

  if (!SCOPED_COACH_CONSENT_SUPPORTED) {
    return jsonError(503, "SCOPED_CONSENT_REQUIRED");
  }

  return jsonError(503, "SCOPED_CONSENT_REQUIRED");
});
