import { jsonError, withErrors } from "@/lib/api-helpers";

// Le marketplace humain n'est pas ouvert tant qu'une disponibilité réelle,
// vérifiable et administrable n'est pas modélisée. Ne jamais exposer les
// fiches de démonstration comme un catalogue public.
export const GET = withErrors(async () =>
  jsonError(503, "COACH_MARKETPLACE_UNAVAILABLE"),
);
