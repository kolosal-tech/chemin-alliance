import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, readJsonLimited, withErrors } from "@/lib/api-helpers";
import { createContextualReport } from "@/lib/reports";
import { requireUser } from "@/lib/security/session";
import { rateLimit, LIMITS } from "@/lib/security/rate-limit";

const schema = z.object({
  targetUserId: z.string().min(1).max(64),
  reason: z.string().min(10).max(2000),
});

/** Signalement - toujours gratuit, jamais derrière un paywall. */
export const POST = withErrors(async (req: Request) => {
  const user = await requireUser();
  if (!user.isVerified) return jsonError(403, "VERIFICATION_REQUIRED");

  const rl = await rateLimit(
    `report:${user.id}`,
    LIMITS.report.limit,
    LIMITS.report.windowMs,
  );
  if (!rl.allowed) return jsonError(429, "RATE_LIMITED");

  const body = schema.parse(await readJsonLimited(req));
  if (body.targetUserId === user.id) return jsonError(400, "INVALID_TARGET");

  const result = await createContextualReport(
    user.id,
    body.targetUserId,
    body.reason,
  );
  if (!result.created) {
    return NextResponse.json({ ok: true, alreadyReported: true });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
});
