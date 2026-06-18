import { timingSafeEqual } from "node:crypto";

/**
 * Garde des routes /api/cron/*.
 *
 * Doctrine "dormant sans secret" : sans CRON_SECRET, on lève 503 — AUCUNE
 * logique métier n'est atteinte, donc rien ne se déclenche tant que l'opérateur
 * n'a pas posé le secret dans Vercel. Une fois CRON_SECRET posé, Vercel injecte
 * automatiquement l'en-tête `Authorization: Bearer <CRON_SECRET>` sur chaque
 * appel planifié ; on le vérifie à temps constant.
 *
 * Lit `process.env.CRON_SECRET` directement (comme provider.ts pour Stripe) :
 * permet la bascule sans rebuild et reste testable en mutant l'env.
 */
export function requireCronAuth(req: Request): void {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    throw Object.assign(new Error("CRON_DORMANT"), { status: 503 });
  }
  const header = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw Object.assign(new Error("UNAUTHORIZED"), { status: 401 });
  }
}
