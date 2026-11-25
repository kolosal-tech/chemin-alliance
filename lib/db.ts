import { PrismaClient } from "@prisma/client";
import { vpsDatabaseUrl } from "@/lib/vps-db";

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
  initPrisma();

function initPrisma() {
  const url = vpsDatabaseUrl() ?? previewSchemaUrl;
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    ...(url ? { datasources: { db: { url } } } : {}),
  });
}

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
