import { NextResponse } from "next/server";
import { z } from "zod";
import {
  clientIp,
  jsonError,
  readJsonLimited,
  withErrors,
} from "@/lib/api-helpers";
import { rateLimit, LIMITS } from "@/lib/security/rate-limit";
import {
  BlessingStateChangedError,
  getPendingBlessingView,
  respondToBlessing,
} from "@/lib/blessing";

export const runtime = "nodejs";

// Page magique du Parrain/Marraine - authentifiée PAR LE TOKEN (pas de session).
// Ne révèle que le prénom du filleul·e (qui l'a choisi) ; aucune donnée de
// l'autre partie du match.
export const GET = withErrors(
  async (req: Request, { params }: { params: Promise<{ token: string }> }) => {
    const rl = await rateLimit(
      `blessing-lookup:${clientIp(req)}`,
      LIMITS.tokenLookup.limit,
      LIMITS.tokenLookup.windowMs,
    );
    if (!rl.allowed) return jsonError(429, "RATE_LIMITED");

    const { token } = await params;
    return NextResponse.json(await getPendingBlessingView(token));
  },
);

const schema = z.object({
  decision: z.enum(["bless", "caution"]),
  note: z.string().trim().max(500).optional(),
});

export const POST = withErrors(
  async (req: Request, { params }: { params: Promise<{ token: string }> }) => {
    const rl = await rateLimit(`blessing-respond:${clientIp(req)}`, 20, 60_000);
    if (!rl.allowed) return jsonError(429, "RATE_LIMITED");

    const { token } = await params;
    const { decision, note } = schema.parse(await readJsonLimited(req));
    try {
      await respondToBlessing(token, decision, note);
    } catch (error) {
      if (error instanceof BlessingStateChangedError) {
        return jsonError(409, "BLESSING_STATE_CHANGED");
      }
      throw error;
    }
    return NextResponse.json({ ok: true });
  },
);
