import { withErrors } from "@/lib/api-helpers";
import { verifyEmailToken } from "@/lib/auth/email-verification";

// Route en segment de chemin : `/api/auth/verify-email/<hex>`. Aucun `=` dans
// l'URL, donc immunisée contre la corruption quoted-printable des emails (qui
// décode `?token=11...` en `?token<0x11>...` et casse la vérification).
export const GET = withErrors(
  async (_req: Request, ctx: { params: { token: string } }) => {
    return verifyEmailToken(ctx.params.token);
  },
);
