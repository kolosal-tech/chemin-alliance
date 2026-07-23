import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("seed de démonstration reproductible", () => {
  const source = readFileSync(
    path.join(process.cwd(), "prisma/seed.ts"),
    "utf8",
  );

  it("restaure le mot de passe et l'état vérifié lors d'une relance", () => {
    expect(
      source.match(/update: \{ passwordHash: password, isVerified: true \}/g),
    ).toHaveLength(2);
  });

  it("construit les références depuis le nom canonique du fixture", () => {
    expect(source).toContain("created[base.displayName] = user.id");
    expect(source).not.toContain("created[user.displayName] = user.id");
  });
});
