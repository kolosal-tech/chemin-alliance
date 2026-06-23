import { withErrors } from "@/lib/api-helpers";
import { verifyEmailToken } from "@/lib/auth/email-verification";

// Route historique : `?token=<hex>`. Conservée pour les liens déjà envoyés.
// Les nouveaux emails pointent vers `/api/auth/verify-email/<hex>` (segment de
// chemin) pour éviter la corruption du `=` par l'encodage quoted-printable.
export const GET = withErrors(async (req: Request) => {
  const token = new URL(req.url).searchParams.get("token");
  return verifyEmailToken(token);
});
