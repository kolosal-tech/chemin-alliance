import { describe, expect, it } from "vitest";
import {
  hashPassword,
  verifyPassword,
  verifyPasswordOrDummy,
} from "@/lib/security/password";

describe("mots de passe Argon2id", () => {
  it("vérifie un mot de passe valide et rejette un autre", async () => {
    const hash = await hashPassword("CorrectPassword123");
    expect(await verifyPassword(hash, "CorrectPassword123")).toBe(true);
    expect(await verifyPassword(hash, "WrongPassword123")).toBe(false);
  });

  it("exécute une vérification factice sans authentifier un email inconnu", async () => {
    expect(await verifyPasswordOrDummy(null, "AnyPassword123")).toBe(false);
    expect(await verifyPasswordOrDummy(undefined, "AnyPassword123")).toBe(
      false,
    );
  });
});
