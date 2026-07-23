import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("en-têtes de sécurité", () => {
  const source = readFileSync(
    path.join(process.cwd(), "next.config.mjs"),
    "utf8",
  );

  it("réserve unsafe-eval au serveur de développement", () => {
    expect(source).toContain('isDevelopment ? " \'unsafe-eval\'" : ""');
    expect(source).not.toContain(
      "\"script-src 'self' 'unsafe-inline' 'unsafe-eval'\"",
    );
  });

  it("interdit les objets incorporés et limite les WebSocket au développement", () => {
    expect(source).toContain("\"object-src 'none'\"");
    expect(source).toContain('isDevelopment ? " ws: wss:" : ""');
  });

  it("rend toutes les URL à bearer privées, non indexables et sans Referer", () => {
    expect(source).toContain("const bearerPrivateHeaders = [");
    expect(source).toContain('source: "/:locale/parrain/:token"');
    expect(source).toContain('source: "/api/blessing/:token"');
    expect(source).toContain('source: "/:locale/reset-password"');
    expect(source).toContain('source: "/:locale/reset-password/:token"');
    expect(source).toContain('source: "/api/auth/verify-email"');
    expect(source).toContain('source: "/api/auth/verify-email/:token"');
    expect(source).toContain(
      'value: "private, no-store, max-age=0, must-revalidate"',
    );
    expect(source).toContain(
      '{ key: "Referrer-Policy", value: "no-referrer" }',
    );
    expect(source).toContain(
      'value: "noindex, nofollow, noarchive, nosnippet"',
    );
  });

  it("interdit le cache et l'indexation de toutes les réponses API", () => {
    expect(source).toContain('source: "/api/:path*"');
    expect(source).toContain("const apiPrivateHeaders = [");
    expect(source).toContain(
      'value: "private, no-store, max-age=0, must-revalidate"',
    );
    expect(source).toContain('value: "noindex, nofollow, noarchive"');
  });
});
