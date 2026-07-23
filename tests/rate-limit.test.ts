import { describe, expect, it, vi } from "vitest";
import {
  createRateLimiter,
  isManagedLocalE2EMemoryRateLimitEnabled,
} from "@/lib/security/rate-limit";

describe("rate-limit - repli mémoire", () => {
  it("autorise jusqu'à la limite puis bloque", async () => {
    const rateLimit = createRateLimiter({
      redis: null,
      failClosed: false,
    });
    const allowed: boolean[] = [];
    for (let i = 0; i < 4; i++) {
      allowed.push((await rateLimit("test", 3, 10_000)).allowed);
    }
    expect(allowed).toEqual([true, true, true, false]);
  });

  it("compte indépendant par clé", async () => {
    const rateLimit = createRateLimiter({
      redis: null,
      failClosed: false,
    });
    const a = await rateLimit("a", 1, 10_000);
    const b = await rateLimit("b", 1, 10_000);
    expect(a.allowed).toBe(true);
    expect(b.allowed).toBe(true);
  });

  it("remaining décroît et la fenêtre expire à la borne", async () => {
    let now = 1_000;
    const rateLimit = createRateLimiter({
      redis: null,
      failClosed: false,
      now: () => now,
    });
    const first = await rateLimit("rem", 2, 100);
    const second = await rateLimit("rem", 2, 100);
    expect(first.remaining).toBe(1);
    expect(second.remaining).toBe(0);
    expect((await rateLimit("rem", 2, 100)).allowed).toBe(false);

    now += 100;
    expect(await rateLimit("rem", 2, 100)).toEqual({
      allowed: true,
      remaining: 1,
    });
  });

  it("refuse une nouvelle clé si la capacité mémoire est saturée", async () => {
    const rateLimit = createRateLimiter({
      redis: null,
      failClosed: false,
      memoryMaxKeys: 1,
    });
    expect((await rateLimit("premiere", 2, 10_000)).allowed).toBe(true);
    expect(await rateLimit("seconde", 2, 10_000)).toEqual({
      allowed: false,
      remaining: 0,
    });
  });

  it("ne purge pas un bucket long avec la fenêtre courte d'une autre clé", async () => {
    let now = 1_000;
    const rateLimit = createRateLimiter({
      redis: null,
      failClosed: false,
      memoryMaxKeys: 1,
      now: () => now,
    });
    expect((await rateLimit("longue", 2, 1_000)).allowed).toBe(true);

    now += 100;
    expect(await rateLimit("courte", 2, 10)).toEqual({
      allowed: false,
      remaining: 0,
    });

    now += 900;
    expect((await rateLimit("courte", 2, 10)).allowed).toBe(true);
  });

  it("valide les paramètres avant de toucher au store", async () => {
    const rateLimit = createRateLimiter({
      redis: null,
      failClosed: false,
    });
    await expect(rateLimit("", 1, 1_000)).rejects.toThrow(TypeError);
    await expect(rateLimit("key", 0, 1_000)).rejects.toThrow(TypeError);
    await expect(rateLimit("key", 1, 0)).rejects.toThrow(TypeError);
  });
});

describe("rate-limit - Redis atomique", () => {
  it("consomme via un unique EVAL Lua avec horloge Redis et identifiant unique", async () => {
    const evalCommand = vi.fn().mockResolvedValue([1, 2]);
    const timeCommand = vi.fn().mockResolvedValue([100, 500_000]);
    const rateLimit = createRateLimiter({
      redis: { eval: evalCommand, time: timeCommand },
      failClosed: true,
      requestId: () => "request-unique",
    });

    expect(await rateLimit("login:ip", 3, 60_000)).toEqual({
      allowed: true,
      remaining: 2,
    });
    expect(timeCommand).toHaveBeenCalledOnce();
    expect(evalCommand).toHaveBeenCalledTimes(1);
    const [script, keys, args] = evalCommand.mock.calls[0];
    expect(keys).toEqual(["rl:login:ip"]);
    expect(args).toEqual(["100500", "60000", "3", "request-unique"]);
    expect(script).not.toContain('redis.call("TIME")');
    expect(script).toContain('redis.call("ZREMRANGEBYSCORE"');
    expect(script).toContain('redis.call("ZCARD"');
    expect(script).toContain('redis.call("ZADD"');
    expect(script).toContain('redis.call("PEXPIRE"');
  });

  it("interprète une décision Redis de refus", async () => {
    const rateLimit = createRateLimiter({
      redis: {
        eval: vi.fn().mockResolvedValue([0, 0]),
        time: vi.fn().mockResolvedValue([100, 0]),
      },
      failClosed: true,
    });
    expect(await rateLimit("key", 1, 1_000)).toEqual({
      allowed: false,
      remaining: 0,
    });
  });

  it("rejette une réponse Redis malformée en mode fail-closed", async () => {
    const onStoreUnavailable = vi.fn();
    const rateLimit = createRateLimiter({
      redis: {
        eval: vi.fn().mockResolvedValue([1, 999]),
        time: vi.fn().mockResolvedValue([100, 0]),
      },
      failClosed: true,
      onStoreUnavailable,
    });
    expect(await rateLimit("key", 2, 1_000)).toEqual({
      allowed: false,
      remaining: 0,
    });
    expect(onStoreUnavailable).toHaveBeenCalledOnce();
  });
});

describe("rate-limit - stratégie de panne", () => {
  it("n'autorise la mémoire en production que pour l'E2E CI local explicitement géré", () => {
    const valid = {
      NODE_ENV: "production",
      CI: "true",
      E2E_MANAGED_FIXTURES: "1",
      E2E_LOCAL_MEMORY_RATE_LIMIT: "1",
      APP_URL: "http://127.0.0.1:3000",
    };
    expect(isManagedLocalE2EMemoryRateLimitEnabled(valid)).toBe(true);

    for (const field of [
      "NODE_ENV",
      "CI",
      "E2E_MANAGED_FIXTURES",
      "E2E_LOCAL_MEMORY_RATE_LIMIT",
      "APP_URL",
    ]) {
      expect(
        isManagedLocalE2EMemoryRateLimitEnabled({
          ...valid,
          [field]: undefined,
        }),
      ).toBe(false);
    }
    expect(
      isManagedLocalE2EMemoryRateLimitEnabled({
        ...valid,
        CI: "1",
      }),
    ).toBe(false);
  });

  it.each([
    "https://chemin-alliance.example",
    "http://127.0.0.1.example:3000",
    "not-a-url",
  ])("refuse le mode mémoire E2E pour APP_URL non loopback (%s)", (appUrl) => {
    expect(
      isManagedLocalE2EMemoryRateLimitEnabled({
        NODE_ENV: "production",
        CI: "true",
        E2E_MANAGED_FIXTURES: "1",
        E2E_LOCAL_MEMORY_RATE_LIMIT: "1",
        APP_URL: appUrl,
      }),
    ).toBe(false);
  });

  it("active réellement la limite mémoire pour le bundle production E2E local", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CI", "true");
    vi.stubEnv("E2E_MANAGED_FIXTURES", "1");
    vi.stubEnv("E2E_LOCAL_MEMORY_RATE_LIMIT", "1");
    vi.stubEnv("APP_URL", "http://127.0.0.1:3000");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    vi.resetModules();

    try {
      const e2eModule = await import("@/lib/security/rate-limit");
      expect(await e2eModule.rateLimit("e2e", 1, 1_000)).toEqual({
        allowed: true,
        remaining: 0,
      });
      expect(await e2eModule.rateLimit("e2e", 1, 1_000)).toEqual({
        allowed: false,
        remaining: 0,
      });
    } finally {
      vi.unstubAllEnvs();
      vi.resetModules();
    }
  });

  it("reste fail-closed hors loopback malgré tous les flags E2E", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CI", "true");
    vi.stubEnv("E2E_MANAGED_FIXTURES", "1");
    vi.stubEnv("E2E_LOCAL_MEMORY_RATE_LIMIT", "1");
    vi.stubEnv("APP_URL", "https://chemin-alliance.example");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    vi.resetModules();

    try {
      const productionModule = await import("@/lib/security/rate-limit");
      expect(await productionModule.rateLimit("remote", 2, 1_000)).toEqual({
        allowed: false,
        remaining: 0,
      });
      expect(consoleError).toHaveBeenCalledOnce();
    } finally {
      vi.unstubAllEnvs();
      vi.resetModules();
      consoleError.mockRestore();
    }
  });

  it("refuse en production simulée si Redis est absent", async () => {
    const onStoreUnavailable = vi.fn();
    const rateLimit = createRateLimiter({
      redis: null,
      failClosed: true,
      onStoreUnavailable,
    });

    expect(await rateLimit("key", 2, 1_000)).toEqual({
      allowed: false,
      remaining: 0,
    });
    expect(onStoreUnavailable).toHaveBeenCalledWith(
      "Redis configuration missing or incomplete",
    );
  });

  it("refuse en fail-closed sur panne Redis et ne journalise qu'une fois", async () => {
    const onStoreUnavailable = vi.fn();
    const rateLimit = createRateLimiter({
      redis: {
        eval: vi.fn().mockRejectedValue(new Error("secret-safe")),
        time: vi.fn().mockResolvedValue([100, 0]),
      },
      failClosed: true,
      onStoreUnavailable,
    });

    expect((await rateLimit("key", 2, 1_000)).allowed).toBe(false);
    expect((await rateLimit("key", 2, 1_000)).allowed).toBe(false);
    expect(onStoreUnavailable).toHaveBeenCalledTimes(1);
    expect(onStoreUnavailable).toHaveBeenCalledWith("Redis error (Error)");
  });

  it("conserve un repli mémoire borné hors production", async () => {
    const rateLimit = createRateLimiter({
      redis: {
        eval: vi.fn().mockRejectedValue(new Error("offline")),
        time: vi.fn().mockResolvedValue([100, 0]),
      },
      failClosed: false,
    });

    expect((await rateLimit("key", 1, 1_000)).allowed).toBe(true);
    expect((await rateLimit("key", 1, 1_000)).allowed).toBe(false);
  });

  it("configure réellement le limiteur par défaut en fail-closed en production", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    vi.stubEnv("E2E_MANAGED_FIXTURES", "");
    vi.stubEnv("E2E_LOCAL_MEMORY_RATE_LIMIT", "");
    vi.stubEnv("APP_URL", "https://chemin-alliance.example");
    vi.resetModules();

    try {
      const productionModule = await import("@/lib/security/rate-limit");
      expect(await productionModule.rateLimit("prod", 2, 1_000)).toEqual({
        allowed: false,
        remaining: 0,
      });
      expect(consoleError).toHaveBeenCalledOnce();
    } finally {
      vi.unstubAllEnvs();
      vi.resetModules();
      consoleError.mockRestore();
    }
  });
});
