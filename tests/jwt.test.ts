import { afterEach, describe, expect, it, vi } from "vitest";
import { SignJWT } from "jose";
import { env } from "@/lib/env";
import {
  sessionCookieOptions,
  signSession,
  verifySession,
} from "@/lib/security/jwt";

const secret = new TextEncoder().encode(env.JWT_SECRET);

describe("session JWT fail-closed", () => {
  it("accepte uniquement un jeton émis avec audience et version de session", async () => {
    const token = await signSession({
      sub: "user-1",
      role: "USER",
      sessionVersion: 4,
    });

    await expect(verifySession(token)).resolves.toEqual({
      sub: "user-1",
      role: "USER",
      sessionVersion: 4,
    });
  });

  it("rejette un ancien jeton sans version de session", async () => {
    const legacy = await new SignJWT({ role: "USER" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("user-1")
      .setIssuer("chemin-alliance")
      .setAudience("chemin-alliance-web")
      .setExpirationTime("5m")
      .sign(secret);

    await expect(verifySession(legacy)).resolves.toBeNull();
  });

  it("rejette une audience ou un algorithme différents", async () => {
    const wrongAudience = await new SignJWT({ role: "USER", sv: 0 })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("user-1")
      .setIssuer("chemin-alliance")
      .setAudience("another-app")
      .setExpirationTime("5m")
      .sign(secret);
    const wrongAlgorithm = await new SignJWT({ role: "USER", sv: 0 })
      .setProtectedHeader({ alg: "HS512" })
      .setSubject("user-1")
      .setIssuer("chemin-alliance")
      .setAudience("chemin-alliance-web")
      .setExpirationTime("5m")
      .sign(secret);

    await expect(verifySession(wrongAudience)).resolves.toBeNull();
    await expect(verifySession(wrongAlgorithm)).resolves.toBeNull();
  });
});

describe("session cookie security", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("autorise uniquement le HTTP loopback du gate E2E géré en CI", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CI", "true");
    vi.stubEnv("E2E_MANAGED_FIXTURES", "1");
    vi.stubEnv("E2E_LOCAL_INSECURE_COOKIE", "1");
    vi.stubEnv("APP_URL", "http://127.0.0.1:3187");

    expect(sessionCookieOptions().secure).toBe(false);
  });

  it.each([
    ["hors CI", { CI: "false" }],
    ["sans fixture géré", { E2E_MANAGED_FIXTURES: "0" }],
    ["sans opt-in explicite", { E2E_LOCAL_INSECURE_COOKIE: "0" }],
    ["sur une cible distante", { APP_URL: "http://example.test" }],
    ["sur une cible HTTPS", { APP_URL: "https://127.0.0.1:3187" }],
  ])("reste Secure %s", (_label, overrides) => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CI", "true");
    vi.stubEnv("E2E_MANAGED_FIXTURES", "1");
    vi.stubEnv("E2E_LOCAL_INSECURE_COOKIE", "1");
    vi.stubEnv("APP_URL", "http://127.0.0.1:3187");
    for (const [key, value] of Object.entries(overrides)) {
      vi.stubEnv(key, value);
    }

    expect(sessionCookieOptions().secure).toBe(true);
  });
});
