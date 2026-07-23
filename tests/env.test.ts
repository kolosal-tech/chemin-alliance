import { describe, expect, it } from "vitest";
import { validateEnv } from "@/lib/env";

const productionEnv = (overrides: Record<string, string | undefined> = {}) => ({
  DATABASE_URL:
    "postgresql://alliance:Db-7qV4pN2zK9xF6@db.internal:5432/alliance",
  JWT_SECRET: "f1K7vP9qT2xN4mR8sW3yB6cD0hJ5uL8zA1eG",
  ENCRYPTION_KEY:
    "91d47f6b2a83c5e0d1498f7a36b2c04e9d71358f6a2c40b8e175d39a64f20c87",
  APP_URL: "https://alliance.invalid",
  RESEND_API_KEY: "re_live_7Kq3pV9mN2xR5tW8",
  EMAIL_FROM: "Chemin d'Alliance <alliance@alliance.invalid>",
  UPSTASH_REDIS_REST_URL: "https://redis.alliance.invalid",
  UPSTASH_REDIS_REST_TOKEN: "redis_7Kq3pV9mN2xR5tW8",
  CRON_SECRET: "cron_7Kq3pV9mN2xR5tW8cD4hJ6sA9eF2uL",
  NODE_ENV: "production",
  ...overrides,
});

describe("validateEnv", () => {
  it("accepte une configuration de production minimale robuste", () => {
    expect(validateEnv(productionEnv()).APP_URL).toBe(
      "https://alliance.invalid",
    );
  });

  it("autorise HTTP en production uniquement sur une adresse loopback", () => {
    expect(
      validateEnv(productionEnv({ APP_URL: "http://127.0.0.1:3000" })).APP_URL,
    ).toBe("http://127.0.0.1:3000");
    expect(() =>
      validateEnv(productionEnv({ APP_URL: "http://alliance.invalid" })),
    ).toThrow(/APP_URL: doit utiliser HTTPS/);
  });

  it.each([
    "ftp://alliance.invalid",
    "https://user:pass@alliance.invalid",
    "https://alliance.invalid/base",
    "https://alliance.invalid/?tenant=1",
    "https://alliance.invalid/#fragment",
  ])("rejette une APP_URL qui n'est pas une origine pure (%s)", (appUrl) => {
    expect(() => validateEnv(productionEnv({ APP_URL: appUrl }))).toThrow(
      /APP_URL: doit (?:être une origine|utiliser le protocole)/,
    );
  });

  it("exige APP_URL explicitement en production au lieu d'utiliser le défaut local", () => {
    expect(() => validateEnv(productionEnv({ APP_URL: undefined }))).toThrow(
      /APP_URL: doit être définie explicitement/,
    );
  });

  it.each([
    "RESEND_API_KEY",
    "EMAIL_FROM",
    "UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN",
    "CRON_SECRET",
  ] as const)("exige %s pour une production fonctionnelle", (field) => {
    expect(() => validateEnv(productionEnv({ [field]: undefined }))).toThrow(
      new RegExp(`${field}: .*production`),
    );
  });

  it("tolère HTTP hors production pour le développement local", () => {
    expect(
      validateEnv(
        productionEnv({
          NODE_ENV: "development",
          APP_URL: "http://dev.internal:3000",
        }),
      ).APP_URL,
    ).toBe("http://dev.internal:3000");
  });

  it.each([
    {
      field: "JWT_SECRET",
      value: "changez-moi-avec-une-valeur-aleatoire-de-48-caracteres",
    },
    { field: "JWT_SECRET", value: "a".repeat(32) },
    { field: "ENCRYPTION_KEY", value: "0".repeat(64) },
    { field: "CRON_SECRET", value: "example-cron-secret-example-cron" },
  ])(
    "rejette en production une valeur faible pour $field sans la divulguer",
    ({ field, value }) => {
      let message = "";
      try {
        validateEnv(productionEnv({ [field]: value }));
      } catch (error) {
        message = error instanceof Error ? error.message : String(error);
      }
      expect(message).toContain(field);
      expect(message).not.toContain(value);
    },
  );

  it("exige une allowlist lorsque OpenRouter est le fournisseur explicite", () => {
    expect(() =>
      validateEnv(
        productionEnv({
          AI_PROVIDER: "openrouter",
          OPENROUTER_API_KEY: "or-secure-key",
        }),
      ),
    ).toThrow(/OPENROUTER_ALLOWED_PROVIDERS: requise/);
  });

  it("exige aussi l'allowlist quand OpenRouter est sélectionné implicitement", () => {
    expect(() =>
      validateEnv(
        productionEnv({
          OPENROUTER_API_KEY: "or-secure-key",
        }),
      ),
    ).toThrow(/OPENROUTER_ALLOWED_PROVIDERS: requise/);
  });

  it("normalise et déduplique les opérateurs OpenRouter autorisés", () => {
    expect(
      validateEnv(
        productionEnv({
          AI_PROVIDER: "openrouter",
          OPENROUTER_API_KEY: "or-secure-key",
          OPENROUTER_ALLOWED_PROVIDERS:
            "Azure, anthropic,azure,google-vertex/eu",
        }),
      ).OPENROUTER_ALLOWED_PROVIDERS,
    ).toEqual(["anthropic", "azure", "google-vertex/eu"]);
  });

  it.each([
    "",
    "azure,,anthropic",
    "Azure<script>",
    "sk-private",
    "provider/../../secret",
  ])("rejette une allowlist OpenRouter invalide (%s)", (allowlist) => {
    expect(() =>
      validateEnv(
        productionEnv({
          AI_PROVIDER: "openrouter",
          OPENROUTER_API_KEY: "or-secure-key",
          OPENROUTER_ALLOWED_PROVIDERS: allowlist,
        }),
      ),
    ).toThrow(/OPENROUTER_ALLOWED_PROVIDERS:/);
  });

  it("rejette un mot de passe de base de données connu comme faible", () => {
    expect(() =>
      validateEnv(
        productionEnv({
          DATABASE_URL:
            "postgresql://alliance:password@db.internal:5432/alliance",
        }),
      ),
    ).toThrow(/DATABASE_URL: contient un mot de passe/);
  });

  it.each(["not-a-url", "mysql://alliance:secure@db.internal:3306/alliance"])(
    "rejette une DATABASE_URL non PostgreSQL (%s)",
    (databaseUrl) => {
      expect(() =>
        validateEnv(
          productionEnv({
            NODE_ENV: "development",
            DATABASE_URL: databaseUrl,
          }),
        ),
      ).toThrow(/DATABASE_URL:/);
    },
  );

  it("limite l'exception de mot de passe local faible à une base loopback", () => {
    expect(
      validateEnv(
        productionEnv({
          DATABASE_URL:
            "postgresql://postgres:postgres@localhost:5432/alliance",
        }),
      ).DATABASE_URL,
    ).toContain("@localhost:");
  });

  it.each([
    {
      configured: {
        UPSTASH_REDIS_REST_URL: "https://redis.invalid",
        UPSTASH_REDIS_REST_TOKEN: undefined,
      },
      missing: "UPSTASH_REDIS_REST_TOKEN",
    },
    {
      configured: { TWILIO_ACCOUNT_SID: "AC_valid_identifier" },
      missing: "TWILIO_AUTH_TOKEN",
    },
    {
      configured: {
        STRIPE_SECRET_KEY: "sk_live_valid",
        STRIPE_PRICE_PREMIUM: "price_live_valid",
      },
      missing: "STRIPE_WEBHOOK_SECRET",
    },
    {
      configured: { WEB_PUSH_PRIVATE_KEY: "private-vapid-value" },
      missing: "NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY",
    },
    {
      configured: { SUPABASE_URL: "https://project.supabase.invalid" },
      missing: "SUPABASE_SERVICE_ROLE_KEY",
    },
  ])(
    "rejette un groupe fournisseur incomplet : $missing",
    ({ configured, missing }) => {
      expect(() => validateEnv(productionEnv(configured))).toThrow(
        new RegExp(`${missing}: requise`),
      );
    },
  );

  it.each([
    ["anthropic", "ANTHROPIC_API_KEY"],
    ["openrouter", "OPENROUTER_API_KEY"],
    ["openai", "OPENAI_API_KEY"],
  ] as const)(
    "exige la clé correspondante quand AI_PROVIDER=%s",
    (provider, expectedKey) => {
      expect(() =>
        validateEnv(productionEnv({ AI_PROVIDER: provider })),
      ).toThrow(new RegExp(`${expectedKey}: requise`));
    },
  );

  it("accepte le fallback IA explicite sans clé fournisseur", () => {
    expect(
      validateEnv(productionEnv({ AI_PROVIDER: "fallback" })).AI_PROVIDER,
    ).toBe("fallback");
  });

  it("rejette un mélange de modes Stripe test/live", () => {
    expect(() =>
      validateEnv(
        productionEnv({
          STRIPE_SECRET_KEY: "sk_live_valid",
          STRIPE_WEBHOOK_SECRET: "whsec_valid",
          STRIPE_PRICE_PREMIUM: "price_valid",
          STRIPE_PUBLISHABLE_KEY: "pk_test_valid",
        }),
      ),
    ).toThrow(/STRIPE_PUBLISHABLE_KEY: doit utiliser le même mode/);
  });

  it("rejette une variable Stripe placée dans le mauvais champ", () => {
    expect(() =>
      validateEnv(
        productionEnv({
          STRIPE_SECRET_KEY: "pk_live_valid",
          STRIPE_WEBHOOK_SECRET: "whsec_valid",
          STRIPE_PRICE_PREMIUM: "price_valid",
        }),
      ),
    ).toThrow(/STRIPE_SECRET_KEY: ne respecte pas le format Stripe/);
  });

  it("traite les valeurs optionnelles vides comme absentes", () => {
    expect(
      validateEnv(
        productionEnv({
          NODE_ENV: "development",
          UPSTASH_REDIS_REST_URL: "",
          UPSTASH_REDIS_REST_TOKEN: "",
        }),
      ).UPSTASH_REDIS_REST_URL,
    ).toBeUndefined();
  });

  it.each(["UPSTASH_REDIS_REST_URL", "SUPABASE_URL"] as const)(
    "exige HTTPS pour %s en production",
    (field) => {
      const companion =
        field === "UPSTASH_REDIS_REST_URL"
          ? { UPSTASH_REDIS_REST_TOKEN: "redis-token-secure-value" }
          : { SUPABASE_SERVICE_ROLE_KEY: "service-role-secure-value" };
      expect(() =>
        validateEnv(
          productionEnv({
            [field]: "http://provider.internal",
            ...companion,
          }),
        ),
      ).toThrow(new RegExp(`${field}: doit utiliser HTTPS`));
    },
  );

  it("valide les longueurs exactes de la paire VAPID en production", () => {
    expect(() =>
      validateEnv(
        productionEnv({
          WEB_PUSH_PRIVATE_KEY: "private-vapid-value",
          NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY: "public-vapid-value",
        }),
      ),
    ).toThrow(/WEB_PUSH_PRIVATE_KEY: ne respecte pas le format VAPID/);

    expect(() =>
      validateEnv(
        productionEnv({
          WEB_PUSH_PRIVATE_KEY: "a".repeat(43),
          NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY: `B${"b".repeat(86)}`,
        }),
      ),
    ).toThrow(/WEB_PUSH_PRIVATE_KEY: contient une valeur d’exemple, répétée/);
  });
});
