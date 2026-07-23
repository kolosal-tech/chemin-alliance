import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, withErrors } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";
import { requireActiveMatchMember } from "@/lib/alliance";
import { rateLimit, LIMITS } from "@/lib/security/rate-limit";
import type { Locale } from "@/lib/core-engine";
import { localIceBreaker } from "@/lib/agents/ice-breaker";

export const runtime = "nodejs";

export const POST = withErrors(
  async (
    _req: Request,
    { params }: { params: Promise<{ matchId: string }> },
  ) => {
    const user = await requireUser();
    if (!user.isVerified) return jsonError(403, "EMAIL_NOT_VERIFIED");

    const { matchId } = await params;
    const rl = await rateLimit(
      `icebreaker:${user.id}:${matchId}`,
      LIMITS.icebreaker.limit,
      LIMITS.icebreaker.windowMs,
    );
    if (!rl.allowed) return jsonError(429, "RATE_LIMITED");

    const match = await requireActiveMatchMember(matchId, user.id);
    const otherId = match.userAId === user.id ? match.userBId : match.userAId;

    const other = await prisma.user.findUnique({
      where: { id: otherId },
      select: { kind: true },
    });

    if (other?.kind === "AI_COMPANION") {
      return jsonError(403, "NOT_SUPPORTED_FOR_COMPANION");
    }

    const locale = (user.locale ?? "fr") as Locale;
    const question = localIceBreaker(locale, `${match.id}:${user.id}`);

    return NextResponse.json({ question });
  },
);
