import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function source(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("journaux des fournisseurs externes", () => {
  it("ne journalise ni erreur brute ni corps de réponse du stockage", () => {
    const storage = source("lib/storage.ts");
    expect(storage).not.toMatch(/console\.error\([^;]*,\s*(?:err|error)\b/s);
    expect(storage).not.toMatch(/console\.error\([^;]*await\s+res\.text\(\)/s);
  });

  it("ne journalise jamais la raison brute d'un échec Web Push", () => {
    const push = source("lib/push.ts");
    expect(push).not.toMatch(/console\.error\([^;]*r\.reason/s);
    expect(push).not.toMatch(/console\.error\([^;]*,\s*(?:err|error)\b/s);
  });

  it.each([
    "app/api/couple/game/[roundId]/answer/route.ts",
    "app/api/matches/request/route.ts",
    "app/api/matches/[matchId]/accept/route.ts",
    "app/api/matches/[matchId]/messages/route.ts",
    "app/api/matches/[matchId]/game/[roundId]/answer/route.ts",
  ])("ne propage pas d'erreur push brute dans %s", (route) => {
    expect(source(route)).not.toMatch(
      /console\.error\([^;]*,\s*(?:err|error)\b/s,
    );
  });

  it.each([
    "lib/api-helpers.ts",
    "lib/blurhash.ts",
    "lib/llm/matrix.ts",
    "app/actions/vault.ts",
    "app/api/billing/portal/route.ts",
    "app/api/webhooks/stripe/route.ts",
  ])("ne journalise pas un objet d'erreur externe brut dans %s", (file) => {
    expect(source(file)).not.toMatch(
      /console\.error\([^;]*,\s*(?:err|error)\b/s,
    );
  });

  it("rend le backfill photo observable sans identifiant ni faux succès", () => {
    const backfill = source("scripts/backfill-blurhash.ts");
    expect(backfill).toContain(
      'if (!(await uploadObject(vpath, "image/jpeg", variant)))',
    );
    expect(backfill).not.toMatch(/console\.(?:log|error)\([^;]*u\.id/s);
    expect(backfill).not.toMatch(/console\.error\([^;]*,\s*(?:err|error)\b/s);
  });
});
