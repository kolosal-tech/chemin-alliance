import { NextResponse } from "next/server";
import { jsonError, withErrors } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";
import { rateLimit, LIMITS } from "@/lib/security/rate-limit";
import { unreadByMatch } from "@/lib/unread";

// Total + détail des messages non lus (badge de navigation, sondé côté client).
export const GET = withErrors(async () => {
  const user = await requireUser();
  const rl = await rateLimit(
    `unread:${user.id}`,
    LIMITS.unread.limit,
    LIMITS.unread.windowMs,
  );
  if (!rl.allowed) return jsonError(429, "RATE_LIMITED");
  const byMatch = await unreadByMatch(user.id);
  const total = Object.values(byMatch).reduce((a, b) => a + b, 0);
  return NextResponse.json({ total, byMatch });
});
