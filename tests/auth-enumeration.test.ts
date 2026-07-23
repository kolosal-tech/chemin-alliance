import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  afterTasks: [] as Array<() => unknown>,
  create: vi.fn(),
  findUnique: vi.fn(),
  updateMany: vi.fn(),
  hashPassword: vi.fn().mockResolvedValue("hashed-password"),
  rateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 9 }),
  sendVerificationEmail: vi.fn().mockResolvedValue(true),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("next/server", async () => {
  const actual =
    await vi.importActual<typeof import("next/server")>("next/server");
  return {
    ...actual,
    after: (task: () => unknown) => {
      mocks.afterTasks.push(task);
    },
  };
});

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      create: mocks.create,
      findUnique: mocks.findUnique,
      updateMany: mocks.updateMany,
    },
  },
}));

vi.mock("@/lib/security/password", () => ({
  hashPassword: mocks.hashPassword,
}));

vi.mock("@/lib/security/rate-limit", () => ({
  rateLimit: mocks.rateLimit,
  LIMITS: {
    auth: { limit: 10, windowMs: 900_000 },
    passwordReset: { limit: 5, windowMs: 3_600_000 },
  },
}));

vi.mock("@/lib/email", () => ({
  sendVerificationEmail: mocks.sendVerificationEmail,
  sendPasswordResetEmail: mocks.sendPasswordResetEmail,
}));

import { POST as register } from "@/app/api/auth/register/route";
import { POST as forgotPassword } from "@/app/api/auth/forgot-password/route";

const registrationBody = {
  email: "member@example.test",
  password: "StrongPassword123",
  displayName: "Membre",
  age: 30,
  gender: "F",
  vertical: "CHRISTIAN_EVANGELICAL",
  intent: "discern",
  country: "BF",
  locale: "fr",
  consentSensitiveData: true,
  consentTerms: true,
};

function jsonRequest(url: string, body: unknown) {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json", "x-real-ip": "192.0.2.10" },
    body: JSON.stringify(body),
  });
}

async function responseShape(response: Response) {
  return { status: response.status, body: await response.json() };
}

beforeEach(() => {
  mocks.afterTasks.length = 0;
  vi.clearAllMocks();
  mocks.hashPassword.mockResolvedValue("hashed-password");
  mocks.rateLimit.mockResolvedValue({ allowed: true, remaining: 9 });
  mocks.sendVerificationEmail.mockResolvedValue(true);
  mocks.sendPasswordResetEmail.mockResolvedValue(undefined);
  mocks.updateMany.mockResolvedValue({ count: 1 });
});

describe("inscription - anti-énumération", () => {
  it("renvoie exactement la même réponse pour une adresse nouvelle ou existante", async () => {
    mocks.create.mockResolvedValueOnce({ email: registrationBody.email });
    const created = await register(
      jsonRequest("https://app.test/api/auth/register", registrationBody),
    );
    expect(mocks.hashPassword).toHaveBeenCalledWith(registrationBody.password);
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          consents: {
            createMany: {
              data: expect.arrayContaining([
                {
                  type: "SENSITIVE_DATA_PROCESSING",
                  version: "sensitive-data-processing:v1",
                  purpose: "CORE_RELATIONSHIP_AND_FAITH_SERVICE",
                  recipient: "CHEMIN_ALLIANCE_CORE_SERVICE",
                },
                {
                  type: "TERMS_OF_SERVICE",
                  version: "terms-of-service:2026-07-23",
                  purpose: "ACCEPTANCE_OF_TERMS_AND_CODE_OF_CONDUCT",
                  recipient: "CHEMIN_ALLIANCE_CORE_SERVICE",
                },
              ]),
            },
          },
        }),
      }),
    );
    expect(mocks.afterTasks).toHaveLength(1);
    await mocks.afterTasks[0]?.();
    expect(mocks.sendVerificationEmail).toHaveBeenCalledOnce();

    mocks.afterTasks.length = 0;
    mocks.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("unique", {
        code: "P2002",
        clientVersion: "test",
      }),
    );
    const existing = await register(
      jsonRequest("https://app.test/api/auth/register", registrationBody),
    );

    const createdShape = await responseShape(created);
    const existingShape = await responseShape(existing);
    expect(createdShape).toEqual(existingShape);
    expect(existingShape).toEqual({ status: 201, body: { ok: true } });
    expect(mocks.hashPassword).toHaveBeenCalledTimes(2);
    expect(mocks.afterTasks).toHaveLength(1);
    await mocks.afterTasks[0]?.();
    expect(mocks.sendVerificationEmail).toHaveBeenCalledTimes(1);
  });

  it("ne masque pas une panne DB sans rapport avec l'unicité", async () => {
    mocks.create.mockRejectedValueOnce(new Error("database offline"));
    const response = await register(
      jsonRequest("https://app.test/api/auth/register", registrationBody),
    );
    expect(response.status).toBe(500);
  });
});

describe("mot de passe oublié - anti-énumération", () => {
  it("renvoie le même résultat et la même forme de travail DB", async () => {
    mocks.findUnique.mockResolvedValueOnce({
      id: "user-id",
      email: registrationBody.email,
      locale: "fr",
    });
    const known = await forgotPassword(
      jsonRequest("https://app.test/api/auth/forgot-password", {
        email: registrationBody.email,
      }),
    );
    expect(mocks.updateMany).toHaveBeenCalledOnce();
    expect(mocks.afterTasks).toHaveLength(1);
    await mocks.afterTasks[0]?.();
    expect(mocks.sendPasswordResetEmail).toHaveBeenCalledOnce();

    mocks.afterTasks.length = 0;
    mocks.findUnique.mockResolvedValueOnce(null);
    const unknown = await forgotPassword(
      jsonRequest("https://app.test/api/auth/forgot-password", {
        email: "unknown@example.test",
      }),
    );

    expect(await responseShape(known)).toEqual(await responseShape(unknown));
    expect(mocks.updateMany).toHaveBeenCalledTimes(2);
    expect(mocks.updateMany.mock.calls[1]?.[0]).toMatchObject({
      where: { id: "__password_reset_unknown_account__" },
    });
    expect(mocks.afterTasks).toHaveLength(1);
    await mocks.afterTasks[0]?.();
    expect(mocks.sendPasswordResetEmail).toHaveBeenCalledTimes(1);
  });
});
