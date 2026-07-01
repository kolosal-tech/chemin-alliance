import { NextResponse } from "next/server";
import { jsonError, withErrors } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";
import { rateLimit, LIMITS } from "@/lib/security/rate-limit";
import { requireMatchMember } from "@/lib/alliance";
import { getSafetySignalForMatch } from "@/lib/safety-signals";

// Signal de sécurité (anti-arnaque) pour une conversation, réservé aux membres.
export const GET = withErrors(
  async (
    _req: Request,
    { params }: { params: Promise<{ matchId: string }> },
  ) => {
    const user = await requireUser();
    const rl = await rateLimit(
      `safety:${user.id}`,
      LIMITS.safetySignal.limit,
      LIMITS.safetySignal.windowMs,
    );
    if (!rl.allowed) return jsonError(429, "RATE_LIMITED");
    const { matchId } = await params;
    await requireMatchMember(matchId, user.id);
    return NextResponse.json(await getSafetySignalForMatch(matchId));
  },
);
