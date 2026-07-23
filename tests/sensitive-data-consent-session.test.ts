import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  verifySession: vi.fn(),
}));

vi.mock("react", () => ({
  cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: () => ({ value: "signed-session" }),
  })),
}));

vi.mock("@/lib/db", () => ({
  prisma: { user: { findUnique: mocks.findUnique } },
}));

vi.mock("@/lib/security/jwt", () => ({
  SESSION_COOKIE: "session",
  verifySession: mocks.verifySession,
}));

import {
  requireAdmin,
  requireAuthenticatedUser,
  requireUser,
} from "@/lib/security/session";

const BASE_USER = {
  id: "user-1",
  role: "USER",
  deletedAt: null,
  sessionVersion: 3,
  consents: [{ id: "consent-1" }],
};

describe("frontière globale du consentement sensible", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.verifySession.mockResolvedValue({
      sub: "user-1",
      sessionVersion: 3,
    });
  });

  it("autorise le produit uniquement avec un consentement actif", async () => {
    mocks.findUnique.mockResolvedValue(BASE_USER);
    await expect(requireUser()).resolves.toMatchObject({ id: "user-1" });
    expect(mocks.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          consents: {
            where: {
              type: "SENSITIVE_DATA_PROCESSING",
              revokedAt: null,
            },
            select: { id: true },
            take: 1,
          },
        }),
      }),
    );
  });

  it("bloque fail-closed les traitements métier après retrait", async () => {
    mocks.findUnique.mockResolvedValue({ ...BASE_USER, consents: [] });

    await expect(requireUser()).rejects.toMatchObject({
      status: 428,
      code: "SENSITIVE_DATA_CONSENT_REQUIRED",
    });
  });

  it("laisse export, retrait et suppression authentifier le compte", async () => {
    mocks.findUnique.mockResolvedValue({ ...BASE_USER, consents: [] });

    await expect(requireAuthenticatedUser()).resolves.toMatchObject({
      id: "user-1",
      consents: [],
    });
  });

  it("ne confond pas la base légale d'un administrateur avec le consentement membre", async () => {
    mocks.findUnique.mockResolvedValue({
      ...BASE_USER,
      role: "ADMIN",
      consents: [],
    });

    await expect(requireAdmin()).resolves.toMatchObject({ role: "ADMIN" });
  });
});
