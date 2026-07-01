import { Redis } from "@upstash/redis";

/**
 * Rate-limiting à fenêtre glissante.
 *
 * - Si UPSTASH_REDIS_REST_URL + _TOKEN sont configurés : limite PARTAGÉE entre
 *   toutes les instances serverless (Vercel) via Upstash Redis (sorted set).
 * - Sinon (ou en cas d'erreur réseau) : repli sur une limite EN MÉMOIRE par
 *   instance - jamais bloquant, jamais d'erreur exposée à l'utilisateur.
 *
 * La fonction est asynchrone : les appelants doivent `await rateLimit(...)`.
 */

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = url && token ? new Redis({ url, token }) : null;

export type RateResult = { allowed: boolean; remaining: number };

// ---- Repli en mémoire (fenêtre glissante par instance) --------------------
type Bucket = { timestamps: number[] };
const buckets = new Map<string, Bucket>();

function memoryRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateResult {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);
  if (bucket.timestamps.length >= limit) {
    buckets.set(key, bucket);
    return { allowed: false, remaining: 0 };
  }
  bucket.timestamps.push(now);
  buckets.set(key, bucket);
  return { allowed: true, remaining: limit - bucket.timestamps.length };
}

// ---- Limite partagée via Upstash (sorted set = fenêtre glissante) ----------
let seq = 0;
async function redisRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateResult> {
  const now = Date.now();
  const k = `rl:${key}`;
  const member = `${now}-${seq++}`;
  const p = redis!.pipeline();
  p.zremrangebyscore(k, 0, now - windowMs);
  p.zadd(k, { score: now, member });
  p.zcard(k);
  p.pexpire(k, windowMs);
  const res = (await p.exec()) as unknown[];
  const count = Number(res[2] ?? 0);
  const allowed = count <= limit;
  return { allowed, remaining: Math.max(0, limit - count) };
}

/**
 * Vérifie et consomme un jeton pour `key`. Renvoie `allowed=false` si la limite
 * est atteinte sur la fenêtre `windowMs`.
 */
// Le repli mémoire ne doit jamais être SILENCIEUX : sur Vercel, chaque instance
// serverless a son propre buffer -> la limite partagée s'évapore. On loggue donc
// le premier échec Redis pour qu'une mauvaise config (ex. URL non-REST) soit
// visible en prod au lieu de dégrader le rate-limit en cachette.
let redisFallbackWarned = false;

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateResult> {
  if (redis) {
    try {
      return await redisRateLimit(key, limit, windowMs);
    } catch (err) {
      if (!redisFallbackWarned) {
        redisFallbackWarned = true;
        console.warn(
          "[rate-limit] Upstash Redis injoignable - repli sur la limite EN MÉMOIRE (par instance, non partagée). " +
            "Vérifier UPSTASH_REDIS_REST_URL (doit être l'URL REST https://…upstash.io, pas redis://…:6379) et UPSTASH_REDIS_REST_TOKEN.",
          err instanceof Error ? err.message : String(err),
        );
      }
      // Repli mémoire : jamais bloquer l'app, mais l'incident est désormais tracé.
    }
  }
  return memoryRateLimit(key, limit, windowMs);
}

/** Limites prédéfinies. */
export const LIMITS = {
  auth: { limit: 10, windowMs: 15 * 60_000 },
  message: { limit: 30, windowMs: 60_000 },
  aiCoach: { limit: 10, windowMs: 60_000 },
  invite: { limit: 8, windowMs: 60 * 60_000 },
  report: { limit: 12, windowMs: 60 * 60_000 },
  passwordReset: { limit: 5, windowMs: 60 * 60_000 },
  passwordChange: { limit: 5, windowMs: 60 * 60_000 },
  emailChange: { limit: 3, windowMs: 60 * 60_000 },
  portal: { limit: 8, windowMs: 60 * 60_000 },
  unread: { limit: 90, windowMs: 60_000 },
  devotional: { limit: 20, windowMs: 60_000 },
  safetySignal: { limit: 40, windowMs: 60_000 },
  // Suggestions : empêche le scraping du vivier via appels répétés.
  suggestions: { limit: 40, windowMs: 60_000 },
  // Rejoindre un espace couple : freine le brute-force du code d'invitation.
  coupleJoin: { limit: 10, windowMs: 60 * 60_000 },
  // Marquer l'onboarding fait (Phase 2) : action idempotente, peu fréquente.
  onboarding: { limit: 10, windowMs: 60 * 60_000 },
  // Ice-breaker IA : génération de question personnalisée (LLM = coûteux).
  icebreaker: { limit: 8, windowMs: 60 * 60_000 },
  // Jeu des questions (création de manche + soumission) : borne l'activité et
  // la relance IA (génération de question quand la banque est épuisée).
  game: { limit: 30, windowMs: 60_000 },
  // Export RGPD (portabilité) : requête coûteuse (multiples lectures + dechiffrement).
  export: { limit: 3, windowMs: 60 * 60_000 },
  // Lookup par token non authentifié (lien magique) : freine l'énumération/brute-force,
  // en cohérence avec LIMITS.auth.
  tokenLookup: { limit: 10, windowMs: 15 * 60_000 },
} as const;
