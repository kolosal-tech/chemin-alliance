/**
 * Rate-limiting en mémoire (fenêtre glissante).
 * Suffisant pour une instance unique (Vercel: par lambda chaude).
 * Pour un trafic multi-instances, brancher Redis/Upstash ici.
 */
type Bucket = { timestamps: number[] };

const buckets = new Map<string, Bucket>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; remaining: number } {
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

/** Limites prédéfinies. */
export const LIMITS = {
  auth: { limit: 10, windowMs: 15 * 60_000 },
  message: { limit: 30, windowMs: 60_000 },
  aiCoach: { limit: 10, windowMs: 60_000 },
} as const;
