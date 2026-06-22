import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Isolation des déploiements preview : ils partagent l'instance Postgres de
// prod mais écrivent dans un schéma dédié "preview", jamais dans "public"
// (= données de production). On réécrit l'URL au runtime UNIQUEMENT quand Vercel
// signale un environnement preview ; la prod (VERCEL_ENV="production") et le
// local restent sur leur schéma par défaut, inchangés.
const previewSchemaUrl =
  process.env.VERCEL_ENV === "preview" && process.env.DATABASE_URL
    ? process.env.DATABASE_URL +
      (process.env.DATABASE_URL.includes("?") ? "&" : "?") +
      "schema=preview"
    : undefined;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    ...(previewSchemaUrl
      ? { datasources: { db: { url: previewSchemaUrl } } }
      : {}),
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
