import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  rateLimit: vi.fn(),
  smsEnabled: vi.fn(),
  userUpdate: vi.fn(),
  phoneFindFirst: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/security/session", () => ({
  requireUser: mocks.requireUser,
}));

vi.mock("@/lib/security/rate-limit", () => ({
  rateLimit: mocks.rateLimit,
}));

vi.mock("@/lib/sms", () => ({
  smsEnabled: mocks.smsEnabled,
  generateCode: vi.fn(() => "123456"),
  hashCode: vi.fn((value: string) => `hash:${value}`),
  startVerification: vi.fn(),
  checkVerification: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      update: mocks.userUpdate,
    },
    phoneVerification: {
      findFirst: mocks.phoneFindFirst,
      deleteMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    $transaction: mocks.transaction,
  },
}));

import { PATCH, POST } from "@/app/api/me/phone/route";

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "production");
  vi.clearAllMocks();
  mocks.requireUser.mockResolvedValue({ id: "user-1" });
  mocks.rateLimit.mockResolvedValue({ allowed: true, remaining: 4 });
  mocks.smsEnabled.mockReturnValue(false);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("vérification téléphone sans fournisseur en production", () => {
  it.each([
    ["POST", POST],
    ["PATCH", PATCH],
  ] as const)(
    "ferme %s en 503 avant toute mutation ou consommation de quota",
    async (_method, handler) => {
      const response = await handler(
        new Request("https://alliance.example/api/me/phone", {
          method: _method,
        }),
      );

      expect(response.status).toBe(503);
      expect(await response.json()).toMatchObject({ error: "SMS_UNAVAILABLE" });
      expect(mocks.rateLimit).not.toHaveBeenCalled();
      expect(mocks.userUpdate).not.toHaveBeenCalled();
      expect(mocks.transaction).not.toHaveBeenCalled();
    },
  );
});
