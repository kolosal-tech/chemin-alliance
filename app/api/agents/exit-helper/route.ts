import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, withErrors } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";
import { requireMatchMember } from "@/lib/alliance";
import { rateLimit } from "@/lib/security/rate-limit";
import { draftExitMessage } from "@/lib/agents/exit-helper";
import type { Locale } from "@/lib/core-engine";

const schema = z.object({
  matchId: z.string().min(1),
  reason: z.enum(["no_alignment", "different_visions", "need_pause", "other"]),
  note: z.string().max(500).default(""),
});

export const POST = withErrors(async (req: Request) => {
  const user = await requireUser();
  const rl = await rateLimit(`exit:${user.id}`, 6, 60 * 60_000);
  if (!rl.allowed) return jsonError(429, "RATE_LIMITED");
  const body = schema.parse(await req.json());
  await requireMatchMember(body.matchId, user.id);
  const draft = await draftExitMessage(
    body.reason,
    body.note,
    (user.locale ?? "fr") as Locale,
  );
  // draft null -> le client garde ses modèles respectueux (fallback)
  return NextResponse.json({ draft });
});
