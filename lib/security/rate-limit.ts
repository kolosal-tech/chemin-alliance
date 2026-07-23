import { Redis } from "@upstash/redis";
import { randomUUID } from "node:crypto";

/**
 * Rate-limiting à fenêtre glissante.
 *
 * - Si UPSTASH_REDIS_REST_URL + _TOKEN sont configurés : limite PARTAGÉE entre
 *   toutes les instances serverless via un script Lua Redis atomique.
 * - Hors production, Redis absent ou indisponible utilise une limite mémoire
 *   par instance pour préserver l'ergonomie locale.
 * - En production, Redis absent, mal configuré ou indisponible refuse la
 *   requête : une limite locale par instance serait contournable.
 * - L'E2E CI peut tester le bundle de production avec la limite mémoire
 *   uniquement via cinq gardes explicites : production, CI, fixtures gérées,
 *   opt-in et APP_URL loopback. Une cible non locale reste toujours fail-closed.
 *
 * La fonction est asynchrone : les appelants doivent `await rateLimit(...)`.
 */

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

export type RateResult = { allowed: boolean; remaining: number };

type RedisEvalClient = Pick<Redis, "eval" | "time">;
type Bucket = { timestamps: number[]; windowMs: number };

export type RateLimiterDependencies = {
  redis: RedisEvalClient | null;
  failClosed: boolean;
  now?: () => number;
  requestId?: () => string;
  memoryMaxKeys?: number;
  onStoreUnavailable?: (detail: string) => void;
};

const MAX_KEY_LENGTH = 512;
const DEFAULT_MEMORY_MAX_KEYS = 10_000;

type RateLimitEnvironment = Record<string, string | undefined>;

export function isManagedLocalE2EMemoryRateLimitEnabled(
  env: RateLimitEnvironment = process.env,
): boolean {
  if (
    env.NODE_ENV !== "production" ||
    env.CI !== "true" ||
    env.E2E_MANAGED_FIXTURES !== "1" ||
    env.E2E_LOCAL_MEMORY_RATE_LIMIT !== "1" ||
    !env.APP_URL
  ) {
    return false;
  }

  try {
    const appUrl = new URL(env.APP_URL);
    return (
      (appUrl.protocol === "http:" || appUrl.protocol === "https:") &&
      ["localhost", "127.0.0.1", "[::1]"].includes(
        appUrl.hostname.toLowerCase(),
      )
    );
  } catch {
    return false;
  }
}

function validateInput(key: string, limit: number, windowMs: number): void {
  if (!key || key.length > MAX_KEY_LENGTH) {
    throw new TypeError(
      `rateLimit key must contain 1..${MAX_KEY_LENGTH} characters`,
    );
  }
  if (!Number.isSafeInteger(limit) || limit <= 0) {
    throw new TypeError("rateLimit limit must be a positive safe integer");
  }
  if (!Number.isSafeInteger(windowMs) || windowMs <= 0) {
    throw new TypeError("rateLimit windowMs must be a positive safe integer");
  }
}

/**
 * Une seule commande EVAL rend indivisibles purge, comptage et consommation.
 * L'heure Redis est obtenue juste avant EVAL puis passée en argument : Redis
 * interdit une écriture après TIME dans un même script. Les tentatives refusées
 * ne sont pas ajoutées et ne prolongent donc pas artificiellement le verrou.
 */
const REDIS_SLIDING_WINDOW_SCRIPT = `
local now = tonumber(ARGV[1])
local window_ms = tonumber(ARGV[2])
local request_limit = tonumber(ARGV[3])
local member = ARGV[4]

redis.call("ZREMRANGEBYSCORE", KEYS[1], "-inf", now - window_ms)
local count = redis.call("ZCARD", KEYS[1])

if count >= request_limit then
  return {0, 0}
end

redis.call("ZADD", KEYS[1], now, member)
redis.call("PEXPIRE", KEYS[1], window_ms)
return {1, request_limit - count - 1}
`;

function parseRedisResult(raw: unknown, limit: number): RateResult {
  if (!Array.isArray(raw) || raw.length !== 2) {
    throw new Error("INVALID_REDIS_RATE_LIMIT_RESPONSE");
  }
  const allowedValue = Number(raw[0]);
  const remaining = Number(raw[1]);
  if (
    (allowedValue !== 0 && allowedValue !== 1) ||
    !Number.isSafeInteger(remaining) ||
    remaining < 0 ||
    remaining > limit ||
    (allowedValue === 0 && remaining !== 0) ||
    (allowedValue === 1 && remaining >= limit)
  ) {
    throw new Error("INVALID_REDIS_RATE_LIMIT_RESPONSE");
  }
  return { allowed: allowedValue === 1, remaining };
}

function redisTimeMilliseconds(raw: [number, number]): number {
  const seconds = Number(raw[0]);
  const microseconds = Number(raw[1]);
  const milliseconds = seconds * 1_000 + Math.floor(microseconds / 1_000);
  if (
    !Number.isSafeInteger(seconds) ||
    seconds < 0 ||
    !Number.isSafeInteger(microseconds) ||
    microseconds < 0 ||
    microseconds >= 1_000_000 ||
    !Number.isSafeInteger(milliseconds)
  ) {
    throw new Error("INVALID_REDIS_TIME_RESPONSE");
  }
  return milliseconds;
}

/**
 * Construit un limiteur isolé. Exporté pour tester directement les stratégies
 * Redis/panne sans modifier process.env ni partager les buckets entre tests.
 */
export function createRateLimiter({
  redis,
  failClosed,
  now = Date.now,
  requestId = randomUUID,
  memoryMaxKeys = DEFAULT_MEMORY_MAX_KEYS,
  onStoreUnavailable,
}: RateLimiterDependencies) {
  if (!Number.isSafeInteger(memoryMaxKeys) || memoryMaxKeys <= 0) {
    throw new TypeError("memoryMaxKeys must be a positive safe integer");
  }

  const buckets = new Map<string, Bucket>();
  let storeUnavailableReported = false;

  function reportStoreUnavailable(detail: string): void {
    if (storeUnavailableReported) return;
    storeUnavailableReported = true;
    onStoreUnavailable?.(detail);
  }

  function memoryRateLimit(
    key: string,
    limit: number,
    windowMs: number,
  ): RateResult {
    const currentTime = now();
    let bucket = buckets.get(key);

    if (!bucket && buckets.size >= memoryMaxKeys) {
      // Purge opportuniste des clés entièrement expirées. Si la capacité reste
      // atteinte, on refuse une nouvelle clé plutôt que d'évincer un bucket
      // actif, ce qui permettrait à un attaquant de réinitialiser sa limite.
      for (const [bucketKey, candidate] of buckets) {
        const active = candidate.timestamps.filter(
          (timestamp) => currentTime - timestamp < candidate.windowMs,
        );
        if (active.length === 0) buckets.delete(bucketKey);
        else candidate.timestamps = active;
      }
      if (buckets.size >= memoryMaxKeys) {
        return { allowed: false, remaining: 0 };
      }
    }

    bucket ??= { timestamps: [], windowMs };
    bucket.windowMs = windowMs;
    bucket.timestamps = bucket.timestamps.filter(
      (timestamp) => currentTime - timestamp < windowMs,
    );
    if (bucket.timestamps.length >= limit) {
      buckets.set(key, bucket);
      return { allowed: false, remaining: 0 };
    }
    bucket.timestamps.push(currentTime);
    buckets.set(key, bucket);
    return { allowed: true, remaining: limit - bucket.timestamps.length };
  }

  return async function limitRequest(
    key: string,
    limit: number,
    windowMs: number,
  ): Promise<RateResult> {
    validateInput(key, limit, windowMs);

    if (redis) {
      try {
        const redisNow = redisTimeMilliseconds(await redis.time());
        const raw = await redis.eval(
          REDIS_SLIDING_WINDOW_SCRIPT,
          [`rl:${key}`],
          [String(redisNow), String(windowMs), String(limit), requestId()],
        );
        return parseRedisResult(raw, limit);
      } catch (error) {
        const errorType = error instanceof Error ? error.name : typeof error;
        reportStoreUnavailable(`Redis error (${errorType})`);
        if (failClosed) return { allowed: false, remaining: 0 };
      }
    } else if (failClosed) {
      reportStoreUnavailable("Redis configuration missing or incomplete");
      return { allowed: false, remaining: 0 };
    }

    return memoryRateLimit(key, limit, windowMs);
  };
}

const managedLocalE2EMemoryRateLimit =
  isManagedLocalE2EMemoryRateLimitEnabled();
const redis =
  !managedLocalE2EMemoryRateLimit && url && token
    ? new Redis({ url, token })
    : null;
const failClosed =
  process.env.NODE_ENV === "production" && !managedLocalE2EMemoryRateLimit;
const defaultRateLimiter = createRateLimiter({
  redis,
  failClosed,
  onStoreUnavailable(detail) {
    const message = failClosed
      ? "[rate-limit] Redis indisponible en production : requête refusée (fail-closed)."
      : "[rate-limit] Redis indisponible hors production : repli mémoire local.";
    // Ne jamais journaliser URL, token ou message réseau potentiellement
    // sensible. Le type générique suffit au diagnostic et à l'alerte.
    if (failClosed) console.error(message, detail);
    else console.warn(message, detail);
  },
});

/** Vérifie et consomme atomiquement un jeton pour `key`. */
export const rateLimit = defaultRateLimiter;

/** Limites prédéfinies. */
export const LIMITS = {
  auth: { limit: 10, windowMs: 15 * 60_000 },
  message: { limit: 30, windowMs: 60_000 },
  aiCoach: { limit: 10, windowMs: 60_000 },
  // Bucket distinct de l'identité : une rotation d'IP ne recrée pas le quota
  // utilisateur et une même IP ne peut pas lancer un volume fournisseur infini.
  aiCoachIp: { limit: 30, windowMs: 60_000 },
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
