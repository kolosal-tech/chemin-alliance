import { describe, it, expect } from "vitest";
import { rateLimit } from "@/lib/security/rate-limit";

// Sans UPSTASH_* en environnement de test, rateLimit utilise le repli mémoire.
describe("rate-limit — repli mémoire", () => {
  it("autorise jusqu'à la limite puis bloque", async () => {
    const key = `test:${Date.now()}:${Math.random()}`;
    const allowed: boolean[] = [];
    for (let i = 0; i < 4; i++) {
      allowed.push((await rateLimit(key, 3, 10_000)).allowed);
    }
    expect(allowed).toEqual([true, true, true, false]);
  });

  it("compte indépendant par clé", async () => {
    const a = await rateLimit(`a:${Math.random()}`, 1, 10_000);
    const b = await rateLimit(`b:${Math.random()}`, 1, 10_000);
    expect(a.allowed).toBe(true);
    expect(b.allowed).toBe(true);
  });

  it("remaining décroît", async () => {
    const key = `rem:${Math.random()}`;
    const first = await rateLimit(key, 5, 10_000);
    const second = await rateLimit(key, 5, 10_000);
    expect(first.remaining).toBe(4);
    expect(second.remaining).toBe(3);
  });
});
