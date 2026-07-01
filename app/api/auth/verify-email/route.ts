import { clientIp, jsonError, withErrors } from "@/lib/api-helpers";
import { verifyEmailToken } from "@/lib/auth/email-verification";
import { rateLimit, LIMITS } from "@/lib/security/rate-limit";

// Route historique : `?token=<hex>`. Conservée pour les liens déjà envoyés.
// Les nouveaux emails pointent vers `/api/auth/verify-email/<hex>` (segment de
// chemin) pour éviter la corruption du `=` par l'encodage quoted-printable.
export const GET = withErrors(async (req: Request) => {
  const rl = await rateLimit(
    `verify-email:${clientIp(req)}`,
    LIMITS.tokenLookup.limit,
    LIMITS.tokenLookup.windowMs,
  );
  if (!rl.allowed) return jsonError(429, "RATE_LIMITED");

  const token = new URL(req.url).searchParams.get("token");
  return verifyEmailToken(token);
});
