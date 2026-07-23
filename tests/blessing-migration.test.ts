import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  path.join(
    process.cwd(),
    "prisma/migrations/0024_blessing_token_hardening/migration.sql",
  ),
  "utf8",
);
const schema = readFileSync(
  path.join(process.cwd(), "prisma/schema.prisma"),
  "utf8",
);

describe("migration Blessing 0024", () => {
  it("invalide tous les anciens bearers sans supprimer l'historique répondu", () => {
    expect(migration).toContain('DELETE FROM "Blessing"');
    expect(migration).toContain("WHERE \"status\" = 'PENDING'");
    expect(migration).toContain('DROP COLUMN "token"');
    expect(migration).not.toMatch(
      /UPDATE\s+"Blessing"\s+SET\s+"tokenHash"\s*=\s*(?:digest|encode)/i,
    );
  });

  it("ajoute les FK fail closed et préserve les réponses lors du retrait sponsor", () => {
    expect(migration).toContain("0024 aborted:");
    expect(migration).toContain('CONSTRAINT "Blessing_matchId_fkey"');
    expect(migration).toContain('CONSTRAINT "Blessing_userId_fkey"');
    expect(migration).toMatch(
      /"Blessing_sponsorId_fkey"[\s\S]*ON DELETE SET NULL/,
    );
  });

  it("impose un seul PENDING et interdit un bearer sur l'historique", () => {
    expect(migration).toMatch(
      /CREATE UNIQUE INDEX "Blessing_one_pending_per_user_match"[\s\S]*WHERE "status" = 'PENDING'/,
    );
    expect(migration).toMatch(
      /"status" IN \('BLESSED', 'CAUTION'\)[\s\S]*"tokenHash" IS NULL[\s\S]*"expiresAt" IS NULL/,
    );
  });

  it("le schéma Prisma n'expose plus de colonne token en clair", () => {
    const blessingModel = schema.match(/model Blessing \{[\s\S]*?\n\}/)?.[0];
    expect(blessingModel).toBeDefined();
    expect(blessingModel).toContain("tokenHash");
    expect(blessingModel).toContain("expiresAt");
    expect(blessingModel).not.toMatch(/^\s*token\s+String/m);
  });
});
