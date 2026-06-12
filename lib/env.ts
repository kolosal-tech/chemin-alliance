import { z } from "zod";

/**
 * Validation des variables d'environnement au démarrage.
 * Échoue proprement avec un message clair si une variable manque.
 */
const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL est requise (PostgreSQL)"),
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
  // Coach IA — optionnel : sans clé, le mode fallback déterministe est actif.
  // AI_PROVIDER force le fournisseur (sinon : Anthropic > OpenRouter > OpenAI).
  AI_PROVIDER: z.enum(["anthropic", "openrouter", "openai", "fallback"]).optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_MODEL: z.string().default("anthropic/claude-haiku-4.5"),
  OPENAI_API_KEY: z.string().optional(),
  // Email transactionnel — sans clé, les liens sont loggés (dev).
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z
    .string()
    .default("Chemin d'Alliance <alliance@kolosaltech.com>"),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Configuration invalide (.env). Corrigez les variables suivantes :\n${issues}`,
    );
  }
  return parsed.data;
}

export const env = loadEnv();

export const aiProvider: "anthropic" | "openrouter" | "openai" | "fallback" =
  env.AI_PROVIDER ??
  (env.ANTHROPIC_API_KEY
    ? "anthropic"
    : env.OPENROUTER_API_KEY
      ? "openrouter"
      : env.OPENAI_API_KEY
        ? "openai"
        : "fallback");
