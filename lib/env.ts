import { z } from "zod";

const emptyStringAsUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalString = z.preprocess(
  emptyStringAsUndefined,
  z.string().min(1).optional(),
);

const optionalUrl = z.preprocess(
  emptyStringAsUndefined,
  z.string().url().optional(),
);

const OPENROUTER_PROVIDER_SLUG_PATTERN =
  /^[a-z0-9]+(?:[._-][a-z0-9]+)*(?:\/[a-z0-9]+(?:[._-][a-z0-9]+)*)?$/;

export function isValidOpenRouterProviderSlug(value: string): boolean {
  return (
    value.length <= 96 &&
    !/^(?:sk|key|secret|token)-/.test(value) &&
    OPENROUTER_PROVIDER_SLUG_PATTERN.test(value)
  );
}

const openRouterAllowedProviders = z.preprocess(
  emptyStringAsUndefined,
  z
    .string()
    .superRefine((raw, context) => {
      const providers = raw
        .split(",")
        .map((value) => value.trim().toLowerCase());
      if (providers.some((provider) => provider.length === 0)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "doit être une liste CSV sans opérateur vide (exemple : provider-a,provider-b)",
        });
      }
      if (
        providers.some(
          (provider) =>
            provider.length > 0 && !isValidOpenRouterProviderSlug(provider),
        )
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "contient un slug invalide (minuscules, chiffres, séparateurs . _ - et une variante / autorisée)",
        });
      }
    })
    .transform((raw) =>
      [
        ...new Set(
          raw
            .split(",")
            .map((value) => value.trim().toLowerCase())
            .filter(Boolean),
        ),
      ].sort((left, right) => left.localeCompare(right)),
    )
    .optional(),
);

/**
 * Validation des variables d'environnement au démarrage.
 * Échoue proprement avec un message clair si une variable manque.
 */
const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .url("DATABASE_URL doit être une URL PostgreSQL valide"),
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET doit faire au moins 32 caractères"),
  ENCRYPTION_KEY: z
    .string()
    .regex(
      /^[0-9a-fA-F]{64}$/,
      "ENCRYPTION_KEY doit être 64 caractères hexadécimaux (clé AES-256)",
    ),
  APP_URL: z.string().url().default("http://localhost:3000"),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  // Coach IA - optionnel : sans clé, le mode fallback déterministe est actif.
  // AI_PROVIDER force le fournisseur (sinon : Anthropic > OpenRouter > OpenAI).
  AI_PROVIDER: z
    .enum(["anthropic", "openrouter", "openai", "fallback"])
    .optional(),
  ANTHROPIC_API_KEY: optionalString,
  OPENROUTER_API_KEY: optionalString,
  OPENROUTER_MODEL: z.string().default("anthropic/claude-haiku-4.5"),
  OPENROUTER_ALLOWED_PROVIDERS: openRouterAllowedProviders,
  OPENAI_API_KEY: optionalString,
  // Email transactionnel - sans clé, les liens sont loggés (dev).
  RESEND_API_KEY: optionalString,
  EMAIL_FROM: z
    .string()
    .default("Chemin d'Alliance <alliance@kolosaltech.com>"),
  // Rate-limit partagé (Upstash Redis) - sans clés, repli en mémoire par instance.
  UPSTASH_REDIS_REST_URL: optionalUrl,
  UPSTASH_REDIS_REST_TOKEN: optionalString,
  // Vérification SMS via Twilio Verify - sans clés, le code est loggé (dormant).
  TWILIO_ACCOUNT_SID: optionalString,
  TWILIO_AUTH_TOKEN: optionalString,
  TWILIO_VERIFY_SERVICE_SID: optionalString,
  // Paiement (Stripe) - sans clés, FakePaymentProvider (aucun abonnement).
  STRIPE_SECRET_KEY: optionalString,
  STRIPE_WEBHOOK_SECRET: optionalString,
  STRIPE_PRICE_PREMIUM: optionalString,
  STRIPE_PUBLISHABLE_KEY: optionalString,
  // Web Push (PWA) - sans clés VAPID, les notifications push sont dormantes.
  // Générer : node -e "console.log(require('web-push').generateVAPIDKeys())"
  WEB_PUSH_EMAIL: z.string().default("mailto:alliance@kolosaltech.com"),
  WEB_PUSH_PRIVATE_KEY: optionalString,
  NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY: optionalString,
  // Photos de profil (Supabase Storage) - sans clés, l'upload est désactivé
  // (bouton masqué). SERVICE_ROLE_KEY = secret serveur (jamais exposé client).
  SUPABASE_URL: optionalUrl,
  SUPABASE_SERVICE_ROLE_KEY: optionalString,
  SUPABASE_PHOTO_BUCKET: z.string().default("profile-photos"),
  // Cron de rétention (Vercel Cron) - sans secret, les routes /api/cron/* sont
  // dormantes (503) : rien ne se déclenche tant que CRON_SECRET n'est pas posé.
  CRON_SECRET: optionalString,
  // Phase 2 - gate du profil avant le matching. OFF par défaut. "true" = ON.
  // Lu côté client via lib/flags (process.env inliné par Next) ; déclaré ici
  // pour documentation/validation serveur.
  NEXT_PUBLIC_PHASE2_GATE_PROFILE: z.enum(["true", "false"]).optional(),
});

type Environment = z.infer<typeof envSchema>;
type EnvironmentSource = Record<string, string | undefined>;
export type AiProvider = "anthropic" | "openrouter" | "openai" | "fallback";

const PROVIDER_GROUPS = [
  ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"],
  ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_VERIFY_SERVICE_SID"],
  ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "STRIPE_PRICE_PREMIUM"],
  ["WEB_PUSH_PRIVATE_KEY", "NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY"],
  ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
] as const satisfies readonly (readonly (keyof Environment)[])[];

const SECRET_FIELDS = [
  "JWT_SECRET",
  "ENCRYPTION_KEY",
  "ANTHROPIC_API_KEY",
  "OPENROUTER_API_KEY",
  "OPENAI_API_KEY",
  "RESEND_API_KEY",
  "UPSTASH_REDIS_REST_TOKEN",
  "TWILIO_AUTH_TOKEN",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "WEB_PUSH_PRIVATE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "CRON_SECRET",
] as const satisfies readonly (keyof Environment)[];

function addIssue(
  issues: z.ZodIssue[],
  path: keyof Environment,
  message: string,
) {
  issues.push({
    code: z.ZodIssueCode.custom,
    path: [path],
    message,
  });
}

function isLoopbackHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  if (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized === "[::1]"
  ) {
    return true;
  }
  const octets = normalized.split(".").map(Number);
  return (
    octets.length === 4 &&
    octets.every(
      (part) => Number.isInteger(part) && part >= 0 && part <= 255,
    ) &&
    octets[0] === 127
  );
}

function isRepeatedPattern(value: string): boolean {
  for (let size = 1; size <= Math.min(8, value.length / 2); size += 1) {
    if (
      value.length % size === 0 &&
      value === value.slice(0, size).repeat(value.length / size)
    ) {
      return true;
    }
  }
  return false;
}

function isKnownWeakSecret(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  const exactWeakValues = new Set([
    "admin",
    "changeme",
    "change-me",
    "password",
    "secret",
    "supersecret",
    "test",
  ]);
  const placeholderMarkers = [
    "changez-moi",
    "example",
    "exemple",
    "placeholder",
    "replace-me",
    "remplacez-moi",
    "your-secret",
    "<secret",
    "sk-...",
    "whsec_...",
  ];
  return (
    exactWeakValues.has(normalized) ||
    placeholderMarkers.some((marker) => normalized.includes(marker)) ||
    isRepeatedPattern(normalized)
  );
}

function resolveAiProvider(data: Environment): AiProvider {
  return (
    data.AI_PROVIDER ??
    (data.ANTHROPIC_API_KEY
      ? "anthropic"
      : data.OPENROUTER_API_KEY
        ? "openrouter"
        : data.OPENAI_API_KEY
          ? "openai"
          : "fallback")
  );
}

function validateProviderGroups(data: Environment, issues: z.ZodIssue[]) {
  for (const group of PROVIDER_GROUPS) {
    const configured = group.filter((key) => Boolean(data[key]));
    if (configured.length === 0 || configured.length === group.length) continue;
    for (const key of group) {
      if (!data[key]) {
        addIssue(
          issues,
          key,
          `requise lorsque ${configured.join(", ")} est configurée`,
        );
      }
    }
  }

  if (data.STRIPE_PUBLISHABLE_KEY && !data.STRIPE_SECRET_KEY) {
    addIssue(
      issues,
      "STRIPE_SECRET_KEY",
      "requise lorsque STRIPE_PUBLISHABLE_KEY est configurée",
    );
  }

  const stripeSecretMode =
    data.STRIPE_SECRET_KEY?.match(/^sk_(test|live)_/)?.[1];
  const stripePublicMode =
    data.STRIPE_PUBLISHABLE_KEY?.match(/^pk_(test|live)_/)?.[1];
  if (
    stripeSecretMode &&
    stripePublicMode &&
    stripeSecretMode !== stripePublicMode
  ) {
    addIssue(
      issues,
      "STRIPE_PUBLISHABLE_KEY",
      "doit utiliser le même mode test/live que STRIPE_SECRET_KEY",
    );
  }

  if (data.NODE_ENV === "production") {
    const stripeFormats = [
      ["STRIPE_SECRET_KEY", /^sk_(test|live)_/],
      ["STRIPE_WEBHOOK_SECRET", /^whsec_/],
      ["STRIPE_PRICE_PREMIUM", /^price_/],
      ["STRIPE_PUBLISHABLE_KEY", /^pk_(test|live)_/],
    ] as const satisfies readonly (readonly [keyof Environment, RegExp])[];
    for (const [field, pattern] of stripeFormats) {
      const value = data[field];
      if (typeof value === "string" && !pattern.test(value)) {
        addIssue(issues, field, "ne respecte pas le format Stripe attendu");
      }
    }
  }

  const requiredAiKey = {
    anthropic: "ANTHROPIC_API_KEY",
    openrouter: "OPENROUTER_API_KEY",
    openai: "OPENAI_API_KEY",
  } as const;
  if (data.AI_PROVIDER && data.AI_PROVIDER !== "fallback") {
    const key = requiredAiKey[data.AI_PROVIDER];
    if (!data[key]) {
      addIssue(issues, key, `requise lorsque AI_PROVIDER=${data.AI_PROVIDER}`);
    }
  }

  if (
    resolveAiProvider(data) === "openrouter" &&
    !data.OPENROUTER_ALLOWED_PROVIDERS?.length
  ) {
    addIssue(
      issues,
      "OPENROUTER_ALLOWED_PROVIDERS",
      "requise lorsque le fournisseur IA effectif est OpenRouter",
    );
  }
}

function validateAppUrl(data: Environment, issues: z.ZodIssue[]) {
  const url = new URL(data.APP_URL);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    addIssue(issues, "APP_URL", "doit utiliser le protocole HTTP ou HTTPS");
  }
  if (
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    addIssue(
      issues,
      "APP_URL",
      "doit être une origine sans identifiants, chemin, paramètres ni fragment",
    );
  }
  if (
    data.NODE_ENV === "production" &&
    url.protocol !== "https:" &&
    !(url.protocol === "http:" && isLoopbackHostname(url.hostname))
  ) {
    addIssue(
      issues,
      "APP_URL",
      "doit utiliser HTTPS en production (HTTP permis uniquement en loopback)",
    );
  }
}

function validateDatabaseUrl(data: Environment, issues: z.ZodIssue[]) {
  const databaseUrl = new URL(data.DATABASE_URL);
  if (
    !["postgres:", "postgresql:", "prisma+postgres:"].includes(
      databaseUrl.protocol,
    )
  ) {
    addIssue(
      issues,
      "DATABASE_URL",
      "doit utiliser un protocole PostgreSQL pris en charge",
    );
  }

  if (data.NODE_ENV !== "production") return;
  let databasePassword: string;
  try {
    databasePassword = decodeURIComponent(databaseUrl.password);
  } catch {
    addIssue(
      issues,
      "DATABASE_URL",
      "contient des identifiants encodés de manière invalide",
    );
    return;
  }
  if (
    databasePassword &&
    !isLoopbackHostname(databaseUrl.hostname) &&
    (isKnownWeakSecret(databasePassword) ||
      ["postgres", "admin", "root"].includes(databasePassword.toLowerCase()))
  ) {
    addIssue(
      issues,
      "DATABASE_URL",
      "contient un mot de passe de base de données notoirement faible",
    );
  }
}

function validateProductionSecurity(data: Environment, issues: z.ZodIssue[]) {
  if (data.NODE_ENV !== "production") return;

  // Le limiteur est volontairement fail-closed en production : sans Redis,
  // toutes les routes protégées répondraient 429. L'email est également
  // indispensable puisque le matching exige une adresse vérifiée. Refuser le
  // démarrage évite donc un déploiement techniquement "vert" mais inutilisable.
  for (const field of [
    "UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN",
    "RESEND_API_KEY",
    "CRON_SECRET",
  ] as const) {
    if (!data[field]) {
      addIssue(issues, field, "requise en production");
    }
  }

  for (const field of SECRET_FIELDS) {
    const value = data[field];
    if (typeof value === "string" && isKnownWeakSecret(value)) {
      addIssue(
        issues,
        field,
        "contient une valeur d’exemple, répétée ou notoirement faible",
      );
    }
  }

  if (new Set(data.JWT_SECRET).size < 8) {
    addIssue(
      issues,
      "JWT_SECRET",
      "doit contenir une diversité suffisante de caractères",
    );
  }

  const encryptionBytes = data.ENCRYPTION_KEY.match(/.{2}/g) ?? [];
  if (new Set(encryptionBytes).size < 12) {
    addIssue(
      issues,
      "ENCRYPTION_KEY",
      "doit présenter une entropie suffisante pour une clé AES-256",
    );
  }

  for (const field of ["UPSTASH_REDIS_REST_URL", "SUPABASE_URL"] as const) {
    const value = data[field];
    if (value && new URL(value).protocol !== "https:") {
      addIssue(issues, field, "doit utiliser HTTPS en production");
    }
  }

  if (
    data.WEB_PUSH_PRIVATE_KEY &&
    !/^[A-Za-z0-9_-]{43}$/.test(data.WEB_PUSH_PRIVATE_KEY)
  ) {
    addIssue(
      issues,
      "WEB_PUSH_PRIVATE_KEY",
      "ne respecte pas le format VAPID privé attendu",
    );
  }
  if (
    data.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY &&
    !/^[A-Za-z0-9_-]{87}$/.test(data.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY)
  ) {
    addIssue(
      issues,
      "NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY",
      "ne respecte pas le format VAPID public attendu",
    );
  }

  if (data.CRON_SECRET && data.CRON_SECRET.length < 32) {
    addIssue(
      issues,
      "CRON_SECRET",
      "doit faire au moins 32 caractères en production",
    );
  }
}

function validateEnvironmentData(data: Environment): z.ZodIssue[] {
  const issues: z.ZodIssue[] = [];
  validateProviderGroups(data, issues);
  validateAppUrl(data, issues);
  validateDatabaseUrl(data, issues);
  validateProductionSecurity(data, issues);
  return issues;
}

/**
 * Valide une source isolée sans modifier `process.env`. Exporté pour permettre
 * des tests déterministes et pour les scripts de pré-déploiement.
 */
export function validateEnv(source: EnvironmentSource): Environment {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Configuration invalide (.env). Corrigez les variables suivantes :\n${issues}`,
    );
  }
  const securityIssues = validateEnvironmentData(parsed.data);
  if (
    parsed.data.NODE_ENV === "production" &&
    (!source.APP_URL || source.APP_URL.trim() === "")
  ) {
    addIssue(
      securityIssues,
      "APP_URL",
      "doit être définie explicitement en production",
    );
  }
  if (
    parsed.data.NODE_ENV === "production" &&
    (!source.EMAIL_FROM || source.EMAIL_FROM.trim() === "")
  ) {
    addIssue(
      securityIssues,
      "EMAIL_FROM",
      "doit être définie explicitement en production",
    );
  }
  if (securityIssues.length > 0) {
    const issues = securityIssues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Configuration invalide (.env). Corrigez les variables suivantes :\n${issues}`,
    );
  }
  return parsed.data;
}

export const env = validateEnv(process.env);

export const aiProvider: AiProvider = resolveAiProvider(env);
