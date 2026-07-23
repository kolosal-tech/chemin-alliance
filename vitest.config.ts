import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    env: {
      DATABASE_URL: "postgres://test:test@localhost:5432/test",
      JWT_SECRET: "vitest-secret-vitest-secret-vitest-secret",
      ENCRYPTION_KEY: "0".repeat(64),
      // Les tests ne doivent jamais hériter d'une clé développeur ni appeler
      // un fournisseur externe. Les suites OpenRouter dédiées surchargent
      // explicitement ce choix avec une clé et une allowlist factices.
      AI_PROVIDER: "fallback",
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
});
