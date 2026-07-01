import { clientIp, jsonError, withErrors } from "@/lib/api-helpers";
import { verifyEmailToken } from "@/lib/auth/email-verification";
import { rateLimit, LIMITS } from "@/lib/security/rate-limit";

// Route en segment de chemin : `/api/auth/verify-email/<hex>`. Aucun `=` dans
// l'URL, donc immunisée contre la corruption quoted-printable des emails (qui
// décode `?token=11...` en `?token<0x11>...` et casse la vérification).
export const GET = withErrors(
  async (req: Request, ctx: { params: Promise<{ token: string }> }) => {
    const rl = await rateLimit(
      `verify-email:${clientIp(req)}`,
      LIMITS.tokenLookup.limit,
      LIMITS.tokenLookup.windowMs,
    );
    if (!rl.allowed) return jsonError(429, "RATE_LIMITED");

    const { token } = await ctx.params;
    return verifyEmailToken(token);
  },
);
