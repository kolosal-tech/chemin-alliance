import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const API_ROOT = path.join(process.cwd(), "app", "api");

function routeFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return routeFiles(absolute);
    return entry.name === "route.ts" ? [absolute] : [];
  });
}

function relativeRoute(file: string) {
  return path.relative(process.cwd(), file).split(path.sep).join("/");
}

// Toute exception à l'authentification de session doit rester rare, visible et
// motivée ici. Ajouter une route à cette liste constitue une décision de
// sécurité explicite, relue par le diff et non un oubli silencieux.
const SESSIONLESS_ROUTES = new Set([
  // Entrées publiques du cycle d'authentification.
  "app/api/auth/forgot-password/route.ts",
  "app/api/auth/login/route.ts",
  "app/api/auth/logout/route.ts",
  "app/api/auth/register/route.ts",
  "app/api/auth/reset-password/route.ts",
  "app/api/auth/verify-email/[token]/route.ts",
  "app/api/auth/verify-email/route.ts",
  // Bearer HMAC à usage limité dans le chemin.
  "app/api/blessing/[token]/route.ts",
  // Catalogue volontairement fermé par une réponse 503 constante.
  "app/api/coaches/[id]/route.ts",
  "app/api/coaches/route.ts",
  // Authentification machine dédiée.
  "app/api/cron/devotional/route.ts",
  "app/api/cron/purge/route.ts",
  // Clé publique nécessaire avant l'inscription Push.
  "app/api/push/vapid-public-key/route.ts",
  // Signature Stripe vérifiée sur le corps brut.
  "app/api/webhooks/stripe/route.ts",
]);

const SESSION_GUARDS = [
  "requireUser",
  "requireAuthenticatedUser",
  "requireAdmin",
] as const;

describe("frontière d'authentification de toutes les routes API", () => {
  const routes = routeFiles(API_ROOT).sort();

  it("ne conserve aucune exception devenue inexistante", () => {
    const discovered = new Set(routes.map(relativeRoute));
    expect(
      [...SESSIONLESS_ROUTES].filter((route) => !discovered.has(route)),
    ).toEqual([]);
  });

  it("exige un garde de session importé et appelé hors exceptions explicites", () => {
    const unguarded = routes
      .map((file) => ({
        file: relativeRoute(file),
        source: readFileSync(file, "utf8"),
      }))
      .filter(({ file }) => !SESSIONLESS_ROUTES.has(file))
      .filter(({ source }) => {
        const imported = source.includes('from "@/lib/security/session"');
        const called = SESSION_GUARDS.some((guard) =>
          new RegExp(`\\b${guard}\\s*\\(`).test(source),
        );
        return !imported || !called;
      })
      .map(({ file }) => file);

    expect(unguarded).toEqual([]);
  });

  it("réserve les routes d'administration au garde administrateur", () => {
    const weakAdminRoutes = routes
      .filter((file) => relativeRoute(file).startsWith("app/api/admin/"))
      .filter((file) => {
        const source = readFileSync(file, "utf8");
        return (
          !source.includes('from "@/lib/security/session"') ||
          !/\brequireAdmin\s*\(/.test(source)
        );
      })
      .map(relativeRoute);

    expect(weakAdminRoutes).toEqual([]);
  });

  it("vérifie les mécanismes dédiés des entrées machine", () => {
    const cronRoutes = routes.filter((file) =>
      relativeRoute(file).startsWith("app/api/cron/"),
    );
    expect(cronRoutes).not.toHaveLength(0);
    for (const file of cronRoutes) {
      expect(readFileSync(file, "utf8")).toMatch(/\brequireCronAuth\s*\(/);
    }

    const stripeWebhook = readFileSync(
      path.join(API_ROOT, "webhooks", "stripe", "route.ts"),
      "utf8",
    );
    expect(stripeWebhook).toContain("stripe.webhooks.constructEvent(");
  });
});
