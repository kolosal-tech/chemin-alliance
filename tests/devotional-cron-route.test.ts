import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  requireCronAuth: vi.fn(),
  sendPushToUser: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: { user: { findMany: mocks.findMany } },
}));
vi.mock("@/lib/cron/auth", () => ({
  requireCronAuth: mocks.requireCronAuth,
}));
vi.mock("@/lib/push", () => ({
  pushEnabled: () => true,
  sendPushToUser: mocks.sendPushToUser,
}));

import { GET } from "@/app/api/cron/devotional/route";

describe("cron des rappels de méditation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sendPushToUser.mockResolvedValue(1);
  });

  it("pagine par identifiant stable lorsque l'envoi purge des abonnements", async () => {
    const firstPage = Array.from({ length: 200 }, (_, index) => ({
      id: `user-${index.toString().padStart(3, "0")}`,
      locale: "fr",
    }));
    const lastUser = { id: "user-200", locale: "fr" };
    mocks.findMany
      .mockResolvedValueOnce(firstPage)
      .mockResolvedValueOnce([lastUser]);

    const response = await GET(
      new Request("https://app.example.test/api/cron/devotional"),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      total: 201,
      sent: 201,
    });
    expect(mocks.requireCronAuth).toHaveBeenCalledOnce();
    expect(mocks.sendPushToUser).toHaveBeenCalledTimes(201);
    expect(mocks.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: {
          deletedAt: null,
          consents: {
            some: {
              type: "SENSITIVE_DATA_PROCESSING",
              revokedAt: null,
            },
          },
          pushSubscriptions: { some: {} },
        },
        orderBy: { id: "asc" },
        take: 200,
      }),
    );
    expect(mocks.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: {
          deletedAt: null,
          consents: {
            some: {
              type: "SENSITIVE_DATA_PROCESSING",
              revokedAt: null,
            },
          },
          pushSubscriptions: { some: {} },
          id: { gt: "user-199" },
        },
      }),
    );
  });
});
