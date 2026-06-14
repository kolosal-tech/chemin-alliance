import { Redis } from "@upstash/redis";

/**
 * Rate-limiting à fenêtre glissante.
 *
 * - Si UPSTASH_REDIS_REST_URL + _TOKEN sont configurés : limite PARTAGÉE entre
 *   toutes les instances serverless (Vercel) via Upstash Redis (sorted set).
 * - Sinon (ou en cas d'erreur réseau) : repli sur une limite EN MÉMOIRE par
 *   instance — jamais bloquant, jamais d'erreur exposée à l'utilisateur.
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
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateResult> {
  if (redis) {
    try {
      return await redisRateLimit(key, limit, windowMs);
    } catch {
      // Réseau Redis indisponible -> repli mémoire (jamais bloquer l'app).
    }
  }
  return memoryRateLimit(key, limit, windowMs);
}

/** Limites prédéfinies. */
export const LIMITS = {
  auth: { limit: 10, windowMs: 15 * 60_000 },
  message: { limit: 30, windowMs: 60_000 },
  aiCoach: { limit: 10, windowMs: 60_000 },
} as const;
